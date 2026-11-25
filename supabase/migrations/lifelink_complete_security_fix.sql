-- ============================================================================
-- LIFELINK – BLOOD DONOR & EMERGENCY BLOOD AVAILABILITY PORTAL
-- CONSOLIDATED DATABASE SCHEMA & COMPLETE SECURITY MIGRATION
-- File: supabase/migrations/lifelink_complete_security_fix.sql
--
-- What this migration does:
--   1. Ensures all 8 core tables exist with strict CHECK, NOT NULL, UNIQUE,
--      and FOREIGN KEY constraints (non-destructive if tables already exist).
--   2. Fixes Administrator Privilege Escalation:
--      - handle_new_user() never trusts raw_user_meta_data->>'role' and always
--        assigns the safe default 'patient' role.
--      - Dedicated triggers promote a user to 'donor' or 'facility' only when
--        they legitimately register a donor or facility record.
--      - Hardens public.is_admin() with SECURITY DEFINER and locked search_path.
--      - Blocks self-promotion and profile tampering via column grants + trigger.
--      - Restricts profiles SELECT strictly to own profile or admin (no cross-user
--        email/phone leakage).
--   3. Fixes Donor Privacy & Data Exposure:
--      - Automatically rounds/fuzzes donor coordinates (~1.1 km grid) on INSERT/UPDATE
--        so exact residential GPS coordinates are never stored.
--      - Removes unrestricted public SELECT on public.donors and provides a
--        privacy-safe RPC public.search_available_donors() returning only minimum
--        matching fields (id, blood_group, city, pin_code, availability_status,
--        fuzzed location_lat/location_lon).
--   4. Fixes Healthcare Facility & Blood Inventory Security:
--      - Forces new facilities to status = 'pending'.
--      - Blocks facility owners from approving themselves or changing ownership.
--      - Restricts blood_inventory publishing/updates strictly to 'approved'
--        facilities (or admins) with non-negative quantity validation.
--   5. Fixes Blood Request & Request Status History Security:
--      - Restricts blood_requests creation to authenticated users.
--      - Restricts blood_requests visibility to the requester, approved facilities,
--        matched donors, and admins (prevents public PII harvesting).
--      - Prevents requesters from marking their own requests as 'fulfilled'.
--      - Makes request_status_history append-only; revokes direct requester INSERT
--        and uses an automatic trigger + actor verification (actor_id = auth.uid()).
--   6. Fixes Donor Contact Request Security:
--      - Combines RLS, column-level UPDATE (status, responded_at) privileges,
--        a BEFORE UPDATE immutability trigger, and the secure RPC functions
--        public.respond_to_contact_request() and public.get_donor_incoming_requests().
--   7. Fixes Notifications Security:
--      - Revokes client INSERT/DELETE on notifications (only server triggers create them).
--      - Combines RLS, column-level UPDATE (is_read) privileges, a BEFORE UPDATE
--        immutability trigger, and the secure RPC public.mark_notification_read().
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 0: UTILITY TRIGGER FOR AUTOMATIC updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- SECTION 1: CORE TABLES & INTEGRITY CONSTRAINTS (NON-DESTRUCTIVE)
-- ============================================================================

-- 1.1 PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'patient'
                CHECK (role IN ('patient', 'donor', 'facility', 'admin')),
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 DONORS
CREATE TABLE IF NOT EXISTS public.donors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group         TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  age                 INT CHECK (age IS NULL OR (age >= 18 AND age <= 65)),
  gender              TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  city                TEXT NOT NULL,
  pin_code            TEXT,
  location_lat        NUMERIC(9,6),
  location_lon        NUMERIC(9,6),
  availability_status TEXT NOT NULL DEFAULT 'available'
                        CHECK (availability_status IN ('available', 'unavailable', 'inactive')),
  consent_to_contact  BOOLEAN NOT NULL DEFAULT TRUE,
  last_donation_date  DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 HEALTHCARE FACILITIES
CREATE TABLE IF NOT EXISTS public.healthcare_facilities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  facility_type       TEXT NOT NULL CHECK (facility_type IN ('hospital', 'blood_bank')),
  address             TEXT,
  city                TEXT NOT NULL,
  pin_code            TEXT,
  phone               TEXT,
  email               TEXT,
  contact_person      TEXT,
  registration_number TEXT,
  licence_number      TEXT,
  location_lat        NUMERIC(9,6),
  location_lon        NUMERIC(9,6),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.healthcare_facilities
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

ALTER TABLE public.healthcare_facilities
  DROP CONSTRAINT IF EXISTS healthcare_facilities_status_check;
ALTER TABLE public.healthcare_facilities
  ADD CONSTRAINT healthcare_facilities_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- 1.4 BLOOD INVENTORY
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES public.healthcare_facilities(id) ON DELETE CASCADE,
  blood_group     TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_available INT NOT NULL DEFAULT 0 CHECK (units_available >= 0 AND units_available <= 10000),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, blood_group)
);

-- 1.5 BLOOD REQUESTS
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      TEXT UNIQUE NOT NULL,
  requester_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_name    TEXT NOT NULL,
  blood_group     TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_required  INT NOT NULL DEFAULT 1 CHECK (units_required > 0 AND units_required <= 50),
  hospital_name   TEXT NOT NULL,
  city            TEXT NOT NULL,
  pin_code        TEXT,
  required_date   DATE NOT NULL,
  urgency         TEXT NOT NULL DEFAULT 'normal'
                    CHECK (urgency IN ('critical', 'high', 'normal')),
  contact_person  TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  additional_info TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'searching', 'contacted', 'fulfilled', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.6 REQUEST STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.request_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  actor_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status           TEXT NOT NULL
                     CHECK (status IN ('pending', 'searching', 'contacted', 'fulfilled', 'cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.request_status_history
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 1.7 DONOR CONTACT REQUESTS
CREATE TABLE IF NOT EXISTS public.donor_contact_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id         UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  requester_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'declined', 'closed')),
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- SECTION 2: ADMINISTRATOR & ROLE MANAGEMENT SECURITY
-- ============================================================================

-- 2.1 Secure is_admin() helper
-- Uses SECURITY DEFINER so RLS policies calling is_admin() do not trigger
-- infinite recursion on public.profiles. Explicitly locks search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 2.2 Helper to check if current user is an approved healthcare facility
CREATE OR REPLACE FUNCTION public.is_approved_facility()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.healthcare_facilities
    WHERE user_id = auth.uid()
      AND status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_facility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_facility() TO authenticated, service_role;

-- 2.3 Signup Trigger: NEVER trust raw_user_meta_data->>'role'
-- Every new user is assigned the safe default 'patient' role upon auth signup.
-- Role transitions to 'donor' or 'facility' happen strictly when the user
-- creates their verified donor or facility record via server triggers below.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    'patient',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2.4 Profile Immutability & Anti-Escalation Trigger
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Trusted database owner, service_role, or verified administrator
  IF current_user IN ('postgres', 'service_role') OR public.is_admin() THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Modification of profile id is not permitted.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Unauthorized role change attempt. Only administrators may change user roles.';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Direct email modification on profile is not permitted.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Modification of created_at is not permitted.';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profile_security() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_security();

-- 2.5 Controlled Role Sync Triggers when registering as Donor or Facility
CREATE OR REPLACE FUNCTION public.sync_profile_role_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'donors' THEN
    UPDATE public.profiles
    SET role = 'donor', updated_at = now()
    WHERE id = NEW.user_id AND role = 'patient';
  ELSIF TG_TABLE_NAME = 'healthcare_facilities' THEN
    UPDATE public.profiles
    SET role = 'facility', updated_at = now()
    WHERE id = NEW.user_id AND role = 'patient';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_role_on_registration() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_donor_role ON public.donors;
CREATE TRIGGER trg_sync_donor_role
  AFTER INSERT ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_on_registration();

DROP TRIGGER IF EXISTS trg_sync_facility_role ON public.healthcare_facilities;
CREATE TRIGGER trg_sync_facility_role
  AFTER INSERT ON public.healthcare_facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_on_registration();


-- ============================================================================
-- SECTION 3: DONOR PRIVACY & DATA PROTECTION
-- ============================================================================

-- 3.1 Trigger to fuzz coordinates (~1.1 km resolution) and protect immutable fields
CREATE OR REPLACE FUNCTION public.enforce_donor_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Cannot modify immutable fields (id, user_id, created_at) on donors.';
    END IF;
  END IF;

  -- Privacy protection: round stored coordinates to 2 decimal places (~1.1 km grid)
  -- so exact residential coordinates are never stored in the database.
  IF NEW.location_lat IS NOT NULL THEN
    NEW.location_lat = ROUND(NEW.location_lat::numeric, 2);
  END IF;
  IF NEW.location_lon IS NOT NULL THEN
    NEW.location_lon = ROUND(NEW.location_lon::numeric, 2);
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_donor_security() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_donors_updated_at ON public.donors;
DROP TRIGGER IF EXISTS trg_enforce_donor_security ON public.donors;
CREATE TRIGGER trg_enforce_donor_security
  BEFORE INSERT OR UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_donor_security();

-- 3.2 Privacy-Safe Donor Discovery RPC
-- Returns only the minimum fields required for blood matching. Never exposes
-- user_id, phone, email, age, gender, or exact coordinates.
CREATE OR REPLACE FUNCTION public.search_available_donors(
  p_blood_group TEXT DEFAULT NULL,
  p_city        TEXT DEFAULT NULL,
  p_pin_code    TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  blood_group         TEXT,
  city                TEXT,
  pin_code            TEXT,
  availability_status TEXT,
  consent_to_contact  BOOLEAN,
  location_lat        NUMERIC,
  location_lon        NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    d.id,
    d.blood_group,
    d.city,
    d.pin_code,
    d.availability_status,
    d.consent_to_contact,
    ROUND(d.location_lat, 2) AS location_lat,
    ROUND(d.location_lon, 2) AS location_lon
  FROM public.donors d
  WHERE d.availability_status = 'available'
    AND d.consent_to_contact = TRUE
    AND d.is_active = TRUE
    AND (p_blood_group IS NULL OR p_blood_group = '' OR d.blood_group = p_blood_group)
    AND (p_city IS NULL OR p_city = '' OR d.city ILIKE '%' || p_city || '%')
    AND (p_pin_code IS NULL OR p_pin_code = '' OR d.pin_code = p_pin_code)
  ORDER BY d.updated_at DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.search_available_donors(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_available_donors(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;


-- ============================================================================
-- SECTION 4: HEALTHCARE FACILITY & BLOOD INVENTORY SECURITY
-- ============================================================================

-- 4.1 Facility Security Trigger
-- Forces status = 'pending' on registration and blocks facility owners from
-- approving themselves or changing protected identity/verification fields.
CREATE OR REPLACE FUNCTION public.enforce_facility_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin() THEN
      NEW.status = 'pending';
    END IF;
    NEW.created_at = now();
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify immutable fields (id, user_id, created_at) on healthcare_facilities.';
  END IF;

  IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Facility owners cannot change verification status. Only administrators can approve, reject, or suspend facilities.';
    END IF;

    IF NEW.facility_type IS DISTINCT FROM OLD.facility_type
       OR NEW.registration_number IS DISTINCT FROM OLD.registration_number
       OR NEW.licence_number IS DISTINCT FROM OLD.licence_number
    THEN
      RAISE EXCEPTION 'Cannot modify verified registration/licence metadata without administrator approval.';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_facility_security() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_facilities_updated_at ON public.healthcare_facilities;
DROP TRIGGER IF EXISTS trg_enforce_facility_security ON public.healthcare_facilities;
CREATE TRIGGER trg_enforce_facility_security
  BEFORE INSERT OR UPDATE ON public.healthcare_facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_facility_security();

-- 4.2 Blood Inventory Security Trigger
-- Ensures only approved facilities (or admins) can publish or update inventory,
-- prevents negative quantities, and blocks changing facility_id.
CREATE OR REPLACE FUNCTION public.enforce_inventory_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_facility_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.facility_id IS DISTINCT FROM OLD.facility_id
    THEN
      RAISE EXCEPTION 'Cannot modify immutable fields (id, facility_id) on blood_inventory.';
    END IF;
  END IF;

  IF NEW.units_available < 0 THEN
    RAISE EXCEPTION 'Inventory units_available cannot be negative.';
  END IF;

  SELECT status INTO v_facility_status
  FROM public.healthcare_facilities
  WHERE id = NEW.facility_id;

  IF v_facility_status IS NULL THEN
    RAISE EXCEPTION 'Invalid facility_id.';
  END IF;

  IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin() THEN
    IF v_facility_status <> 'approved' THEN
      RAISE EXCEPTION 'Only verified (approved) healthcare facilities may publish or update blood inventory.';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_inventory_security() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.blood_inventory;
DROP TRIGGER IF EXISTS trg_enforce_inventory_security ON public.blood_inventory;
CREATE TRIGGER trg_enforce_inventory_security
  BEFORE INSERT OR UPDATE ON public.blood_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inventory_security();


-- ============================================================================
-- SECTION 5: BLOOD REQUESTS & REQUEST STATUS HISTORY SECURITY
-- ============================================================================

-- 5.1 Blood Request Security Trigger
-- Enforces controlled status transitions:
--   - Requesters: can only edit their own 'pending' request or cancel it ('cancelled').
--     Requesters can NEVER mark a request as 'fulfilled', 'searching', or 'contacted'.
--   - Approved Facilities: can only update status ('searching', 'contacted', 'fulfilled')
--     on active requests without altering patient/requester details.
--   - Administrators: can manage all status transitions.
CREATE OR REPLACE FUNCTION public.enforce_blood_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify immutable fields (id, request_id, created_at) on blood_requests.';
  END IF;

  IF current_user IN ('postgres', 'service_role') OR public.is_admin() THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Ownership cannot be changed by non-admins
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership (requester_id) of a blood request.';
  END IF;

  -- Case A: Authenticated user is the requester
  IF auth.uid() = OLD.requester_id THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Requesters can only modify or cancel blood requests that are currently in pending status.';
    END IF;

    IF NEW.status NOT IN ('pending', 'cancelled') THEN
      RAISE EXCEPTION 'Requesters cannot set request status to %. Requesters may only keep status as pending or cancel the request.', NEW.status;
    END IF;

  -- Case B: Authenticated user is an approved healthcare facility
  ELSIF public.is_approved_facility() THEN
    -- Facilities may only advance status, not edit patient/contact details
    IF NEW.patient_name IS DISTINCT FROM OLD.patient_name
       OR NEW.blood_group IS DISTINCT FROM OLD.blood_group
       OR NEW.units_required IS DISTINCT FROM OLD.units_required
       OR NEW.hospital_name IS DISTINCT FROM OLD.hospital_name
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.pin_code IS DISTINCT FROM OLD.pin_code
       OR NEW.required_date IS DISTINCT FROM OLD.required_date
       OR NEW.urgency IS DISTINCT FROM OLD.urgency
       OR NEW.contact_person IS DISTINCT FROM OLD.contact_person
       OR NEW.contact_phone IS DISTINCT FROM OLD.contact_phone
       OR NEW.additional_info IS DISTINCT FROM OLD.additional_info
    THEN
      RAISE EXCEPTION 'Healthcare facilities may only update the status of a blood request, not patient or contact details.';
    END IF;

    IF OLD.status NOT IN ('pending', 'searching', 'contacted') THEN
      RAISE EXCEPTION 'Cannot update status of a % blood request.', OLD.status;
    END IF;

    IF NEW.status NOT IN ('searching', 'contacted', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid facility status transition to %.', NEW.status;
    END IF;

  ELSE
    RAISE EXCEPTION 'Unauthorized attempt to update blood request.';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_blood_request_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_requests_updated_at ON public.blood_requests;
DROP TRIGGER IF EXISTS trg_enforce_blood_request_update ON public.blood_requests;
CREATE TRIGGER trg_enforce_blood_request_update
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_blood_request_update();

-- 5.2 Request Status History Triggers
-- Automatically records actor_id = auth.uid() and timestamp on every blood_request
-- creation and status change, and prevents actor impersonation on manual inserts.
CREATE OR REPLACE FUNCTION public.enforce_status_history_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.actor_id = auth.uid();
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_status_history_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_status_history_insert ON public.request_status_history;
CREATE TRIGGER trg_enforce_status_history_insert
  BEFORE INSERT ON public.request_status_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_status_history_insert();

CREATE OR REPLACE FUNCTION public.log_blood_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_status_history (blood_request_id, actor_id, status, notes, created_at)
    VALUES (NEW.id, auth.uid(), NEW.status, 'Emergency blood request created', now());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_status_history (blood_request_id, actor_id, status, notes, created_at)
    VALUES (
      NEW.id,
      auth.uid(),
      NEW.status,
      format('Status changed from %s to %s', OLD.status, NEW.status),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_blood_request_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_blood_request_status ON public.blood_requests;
CREATE TRIGGER trg_log_blood_request_status
  AFTER INSERT OR UPDATE OF status ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_blood_request_status_change();


-- ============================================================================
-- SECTION 6: DONOR CONTACT REQUESTS SECURITY & RPCs
-- ============================================================================

-- 6.1 Defensive Trigger for donor_contact_requests
CREATE OR REPLACE FUNCTION public.enforce_contact_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.donor_id IS DISTINCT FROM OLD.donor_id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.blood_request_id IS DISTINCT FROM OLD.blood_request_id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Cannot modify immutable fields (id, donor_id, requester_id, blood_request_id, message, created_at) on donor_contact_requests.';
  END IF;

  IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin() THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'This contact request has already been responded to and cannot be modified again.';
    END IF;

    IF NEW.status NOT IN ('accepted', 'declined') THEN
      RAISE EXCEPTION 'Invalid donor response status: %. Allowed values are accepted or declined.', NEW.status;
    END IF;
  END IF;

  IF NEW.status IN ('accepted', 'declined') AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;
  NEW.updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_contact_request_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_contact_requests_updated_at ON public.donor_contact_requests;
DROP TRIGGER IF EXISTS trg_enforce_contact_request_update ON public.donor_contact_requests;
CREATE TRIGGER trg_enforce_contact_request_update
  BEFORE UPDATE ON public.donor_contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_contact_request_update();

-- 6.2 Secure RPC: respond_to_contact_request()
-- Validates donor ownership, pending status, and valid outcome ('accepted' | 'declined'),
-- and sets server-authoritative responded_at and updated_at timestamps.
CREATE OR REPLACE FUNCTION public.respond_to_contact_request(
  p_request_id UUID,
  p_status     TEXT
)
RETURNS public.donor_contact_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.donor_contact_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response status: %. Must be accepted or declined.', p_status;
  END IF;

  SELECT dcr.* INTO v_row
  FROM public.donor_contact_requests dcr
  JOIN public.donors d ON d.id = dcr.donor_id
  WHERE dcr.id = p_request_id
    AND (d.user_id = auth.uid() OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact request not found or you are not authorized to respond to it.';
  END IF;

  IF v_row.status <> 'pending' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'This contact request has already been responded to (current status: %).', v_row.status;
  END IF;

  UPDATE public.donor_contact_requests
  SET status       = p_status,
      responded_at = now(),
      updated_at   = now()
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_contact_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_contact_request(UUID, TEXT) TO authenticated, service_role;

-- 6.3 Privacy-Safe RPC for Donors to View Incoming Contact Requests
-- Returns only requester full_name and city (never email or phone) without
-- opening public.profiles to cross-user SELECT queries.
CREATE OR REPLACE FUNCTION public.get_donor_incoming_requests(
  p_donor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.donors d
    WHERE d.id = p_donor_id
      AND (d.user_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Not authorized to view contact requests for this donor profile.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', dcr.id,
        'donor_id', dcr.donor_id,
        'requester_id', dcr.requester_id,
        'blood_request_id', dcr.blood_request_id,
        'message', dcr.message,
        'status', dcr.status,
        'responded_at', dcr.responded_at,
        'created_at', dcr.created_at,
        'requester', jsonb_build_object(
          'full_name', p.full_name,
          'city', p.city
        ),
        'blood_request', CASE
          WHEN br.id IS NOT NULL THEN jsonb_build_object(
            'patient_name', br.patient_name,
            'blood_group', br.blood_group,
            'urgency', br.urgency,
            'hospital_name', br.hospital_name
          )
          ELSE NULL
        END
      )
      ORDER BY dcr.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.donor_contact_requests dcr
  LEFT JOIN public.profiles p ON p.id = dcr.requester_id
  LEFT JOIN public.blood_requests br ON br.id = dcr.blood_request_id
  WHERE dcr.donor_id = p_donor_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_donor_incoming_requests(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_incoming_requests(UUID) TO authenticated, service_role;


-- ============================================================================
-- SECTION 7: NOTIFICATIONS SECURITY & RPC
-- ============================================================================

-- 7.1 Defensive Trigger for notifications
CREATE OR REPLACE FUNCTION public.enforce_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.link IS DISTINCT FROM OLD.link
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Users may only update the is_read status of their notifications.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_notification_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_notification_update ON public.notifications;
CREATE TRIGGER trg_enforce_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_notification_update();

-- 7.2 Secure RPC: mark_notification_read()
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.notifications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND (user_id = auth.uid() OR public.is_admin())
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or access denied.';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated, service_role;

-- 7.3 Server-Side Notification Trigger on donor_contact_requests
CREATE OR REPLACE FUNCTION public.handle_contact_request_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_donor_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO v_donor_user_id
    FROM public.donors
    WHERE id = NEW.donor_id;

    IF v_donor_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (
        v_donor_user_id,
        'New Blood Donation Contact Request',
        'A patient or requester has requested to contact you regarding a blood requirement.',
        '/dashboard/donor'
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.requester_id,
      'Donor Responded to Your Request',
      format('A donor has %s your contact request.', NEW.status),
      '/dashboard/patient'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_contact_request_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_contact_request_notifications ON public.donor_contact_requests;
CREATE TRIGGER trg_contact_request_notifications
  AFTER INSERT OR UPDATE ON public.donor_contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contact_request_notifications();


-- ============================================================================
-- SECTION 8: PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_donors_search
  ON public.donors (blood_group, city, availability_status)
  WHERE consent_to_contact = TRUE AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_donors_pin_code
  ON public.donors (pin_code);

CREATE INDEX IF NOT EXISTS idx_facilities_status_city
  ON public.healthcare_facilities (status, city);

CREATE INDEX IF NOT EXISTS idx_inventory_facility_bg
  ON public.blood_inventory (facility_id, blood_group);

CREATE INDEX IF NOT EXISTS idx_requests_status_urgency
  ON public.blood_requests (status, urgency, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_requester
  ON public.blood_requests (requester_id);

CREATE INDEX IF NOT EXISTS idx_history_request_id
  ON public.request_status_history (blood_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_donor
  ON public.donor_contact_requests (donor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_requester
  ON public.donor_contact_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);


-- ============================================================================
-- SECTION 9: LEAST-PRIVILEGE TABLE & COLUMN GRANTS
-- ============================================================================

-- 9.1 PROFILES: No direct client INSERT or DELETE; authenticated can only update safe profile fields
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, city, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 9.2 DONORS: Public discovery uses search_available_donors() RPC.
-- Direct table access is restricted to authenticated users (for own profile & contacted donor lookup).
REVOKE ALL ON public.donors FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.donors TO authenticated;
GRANT UPDATE (
  blood_group,
  age,
  gender,
  city,
  pin_code,
  location_lat,
  location_lon,
  availability_status,
  consent_to_contact,
  last_donation_date,
  is_active,
  updated_at
) ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;

-- 9.3 HEALTHCARE FACILITIES: public reads approved facilities; owners update non-protected fields
REVOKE ALL ON public.healthcare_facilities FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  name,
  facility_type,
  address,
  city,
  pin_code,
  phone,
  email,
  contact_person,
  location_lat,
  location_lon,
  status,
  created_at,
  updated_at
) ON public.healthcare_facilities TO anon;
GRANT SELECT, INSERT ON public.healthcare_facilities TO authenticated;
GRANT UPDATE (
  name,
  address,
  city,
  pin_code,
  phone,
  email,
  contact_person,
  location_lat,
  location_lon,
  status,
  updated_at
) ON public.healthcare_facilities TO authenticated;
GRANT ALL ON public.healthcare_facilities TO service_role;

-- 9.4 BLOOD INVENTORY: public reads inventory of approved facilities; approved owners manage stock
REVOKE ALL ON public.blood_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.blood_inventory TO anon, authenticated;
GRANT INSERT, DELETE ON public.blood_inventory TO authenticated;
GRANT UPDATE (blood_group, units_available, updated_at) ON public.blood_inventory TO authenticated;
GRANT ALL ON public.blood_inventory TO service_role;

-- 9.5 BLOOD REQUESTS: authenticated users create/read/update eligible requests
REVOKE ALL ON public.blood_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.blood_requests TO authenticated;
GRANT UPDATE (
  patient_name,
  blood_group,
  units_required,
  hospital_name,
  city,
  pin_code,
  required_date,
  urgency,
  contact_person,
  contact_phone,
  additional_info,
  status,
  updated_at
) ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;

-- 9.6 REQUEST STATUS HISTORY: append-only; no UPDATE or DELETE for clients; no direct requester INSERT
REVOKE ALL ON public.request_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.request_status_history TO authenticated;
GRANT ALL ON public.request_status_history TO service_role;

-- 9.7 DONOR CONTACT REQUESTS: authenticated creates/reads; donors only update (status, responded_at)
REVOKE ALL ON public.donor_contact_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.donor_contact_requests TO authenticated;
GRANT UPDATE (status, responded_at) ON public.donor_contact_requests TO authenticated;
GRANT ALL ON public.donor_contact_requests TO service_role;

-- 9.8 NOTIFICATIONS: server-only creation; users only SELECT and UPDATE (is_read)
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;


-- ============================================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthcare_facilities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_contact_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;

-- ── 10.1 PROFILES POLICIES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

-- Strictly own profile or admin (no cross-user email/phone exposure)
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.2 DONORS POLICIES ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can search available donors" ON public.donors;
DROP POLICY IF EXISTS "Donors read own or contacted record" ON public.donors;
DROP POLICY IF EXISTS "Donors manage own record" ON public.donors;
DROP POLICY IF EXISTS "Donors insert own record" ON public.donors;
DROP POLICY IF EXISTS "Donors update own record" ON public.donors;
DROP POLICY IF EXISTS "Admins manage all donors" ON public.donors;

-- Public/authenticated donor discovery uses search_available_donors() RPC.
-- Direct SELECT on public.donors is restricted to the donor themselves,
-- a requester who has sent a contact request to that donor, or an admin.
CREATE POLICY "Donors read own or contacted record" ON public.donors
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donor_contact_requests dcr
      WHERE dcr.donor_id = donors.id
        AND dcr.requester_id = auth.uid()
    )
  );

CREATE POLICY "Donors insert own record" ON public.donors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Donors update own record" ON public.donors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all donors" ON public.donors
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.3 HEALTHCARE FACILITIES POLICIES ─────────────────────────────────────
DROP POLICY IF EXISTS "Public reads approved facilities" ON public.healthcare_facilities;
DROP POLICY IF EXISTS "Facility users manage own record" ON public.healthcare_facilities;
DROP POLICY IF EXISTS "Facility users insert own record" ON public.healthcare_facilities;
DROP POLICY IF EXISTS "Facility users update own record" ON public.healthcare_facilities;
DROP POLICY IF EXISTS "Admins manage all facilities" ON public.healthcare_facilities;

CREATE POLICY "Public reads approved facilities" ON public.healthcare_facilities
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Facility users insert own record" ON public.healthcare_facilities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "Facility users update own record" ON public.healthcare_facilities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT hf.status FROM public.healthcare_facilities hf WHERE hf.id = healthcare_facilities.id)
  );

CREATE POLICY "Admins manage all facilities" ON public.healthcare_facilities
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.4 BLOOD INVENTORY POLICIES ───────────────────────────────────────────
DROP POLICY IF EXISTS "Public reads inventory of approved facilities" ON public.blood_inventory;
DROP POLICY IF EXISTS "Facility manages own inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Approved facility inserts own inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Approved facility updates own inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Approved facility deletes own inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Admins manage all inventory" ON public.blood_inventory;

CREATE POLICY "Public reads inventory of approved facilities" ON public.blood_inventory
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.healthcare_facilities hf
      WHERE hf.id = blood_inventory.facility_id
        AND (hf.status = 'approved' OR hf.user_id = auth.uid())
    )
    OR public.is_admin()
  );

-- Only APPROVED facilities can publish or update inventory
CREATE POLICY "Approved facility inserts own inventory" ON public.blood_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.healthcare_facilities hf
      WHERE hf.id = blood_inventory.facility_id
        AND hf.user_id = auth.uid()
        AND hf.status = 'approved'
    )
  );

CREATE POLICY "Approved facility updates own inventory" ON public.blood_inventory
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.healthcare_facilities hf
      WHERE hf.id = blood_inventory.facility_id
        AND hf.user_id = auth.uid()
        AND hf.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.healthcare_facilities hf
      WHERE hf.id = blood_inventory.facility_id
        AND hf.user_id = auth.uid()
        AND hf.status = 'approved'
    )
  );

CREATE POLICY "Approved facility deletes own inventory" ON public.blood_inventory
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.healthcare_facilities hf
      WHERE hf.id = blood_inventory.facility_id
        AND hf.user_id = auth.uid()
        AND hf.status IN ('approved', 'pending')
    )
  );

CREATE POLICY "Admins manage all inventory" ON public.blood_inventory
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.5 BLOOD REQUESTS POLICIES ────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can create a blood request" ON public.blood_requests;
DROP POLICY IF EXISTS "Authenticated users create blood request" ON public.blood_requests;
DROP POLICY IF EXISTS "Requester reads own requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins read all requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Read active or own blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Authorized users read blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Requester or admin updates blood request" ON public.blood_requests;
DROP POLICY IF EXISTS "Requester updates own pending blood request" ON public.blood_requests;
DROP POLICY IF EXISTS "Approved facility updates active blood request status" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins manage all blood requests" ON public.blood_requests;

-- Requirement 6: Authenticated users create blood requests
CREATE POLICY "Authenticated users create blood request" ON public.blood_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
  );

-- Requirement 6: Prevent unauthorized access to other users' requests.
-- Accessible to: the requester, approved facilities, donors contacted for this request, and admins.
CREATE POLICY "Authorized users read blood requests" ON public.blood_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR public.is_approved_facility()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.donor_contact_requests dcr
      JOIN public.donors d ON d.id = dcr.donor_id
      WHERE dcr.blood_request_id = blood_requests.id
        AND d.user_id = auth.uid()
    )
  );

-- Requirement 6: Requesters can only update or cancel their own eligible pending requests
CREATE POLICY "Requester updates own pending blood request" ON public.blood_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = requester_id
    AND status IN ('pending', 'cancelled')
  );

-- Requirement 6: Approved facilities can update status of active requests
CREATE POLICY "Approved facility updates active blood request status" ON public.blood_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.is_approved_facility()
    AND status IN ('pending', 'searching', 'contacted')
  )
  WITH CHECK (
    public.is_approved_facility()
    AND status IN ('searching', 'contacted', 'fulfilled')
  );

CREATE POLICY "Admins manage all blood requests" ON public.blood_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.6 REQUEST STATUS HISTORY POLICIES ────────────────────────────────────
DROP POLICY IF EXISTS "Requester reads own history" ON public.request_status_history;
DROP POLICY IF EXISTS "Read status history" ON public.request_status_history;
DROP POLICY IF EXISTS "Insert status history" ON public.request_status_history;
DROP POLICY IF EXISTS "Authorized users read status history" ON public.request_status_history;
DROP POLICY IF EXISTS "Facilities and admins insert status history" ON public.request_status_history;

-- Requirement 7: Users can only view status history for requests they are authorized to access
CREATE POLICY "Authorized users read status history" ON public.request_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE br.id = request_status_history.blood_request_id
        AND (
          br.requester_id = auth.uid()
          OR public.is_approved_facility()
          OR public.is_admin()
        )
    )
  );

-- Requirement 7: Requesters must NOT directly insert, edit, or delete status history.
-- Only approved facilities and administrators can directly insert history entries
-- (initial creation & status transitions are logged automatically by trg_log_blood_request_status).
CREATE POLICY "Facilities and admins insert status history" ON public.request_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_approved_facility()
      AND EXISTS (
        SELECT 1 FROM public.blood_requests br
        WHERE br.id = request_status_history.blood_request_id
          AND br.status IN ('pending', 'searching', 'contacted', 'fulfilled')
      )
    )
  );

-- ── 10.7 DONOR CONTACT REQUESTS POLICIES ────────────────────────────────────
DROP POLICY IF EXISTS "Donor reads own contact requests" ON public.donor_contact_requests;
DROP POLICY IF EXISTS "Requester reads own contact requests" ON public.donor_contact_requests;
DROP POLICY IF EXISTS "Authenticated can create contact request" ON public.donor_contact_requests;
DROP POLICY IF EXISTS "Donor can update own contact request" ON public.donor_contact_requests;
DROP POLICY IF EXISTS "Admins manage all contact requests" ON public.donor_contact_requests;

CREATE POLICY "Donor reads own contact requests" ON public.donor_contact_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = donor_contact_requests.donor_id
        AND d.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Authenticated can create contact request" ON public.donor_contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
    AND responded_at IS NULL
    -- Target donor must be active, available, consenting, and not the requester themselves
    AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = donor_contact_requests.donor_id
        AND d.user_id <> auth.uid()
        AND d.availability_status = 'available'
        AND d.consent_to_contact = TRUE
        AND d.is_active = TRUE
    )
  );

CREATE POLICY "Donor can update own contact request" ON public.donor_contact_requests
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = donor_contact_requests.donor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
    AND responded_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = donor_contact_requests.donor_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all contact requests" ON public.donor_contact_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10.8 NOTIFICATIONS POLICIES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_read IS NOT NULL
  );

CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
