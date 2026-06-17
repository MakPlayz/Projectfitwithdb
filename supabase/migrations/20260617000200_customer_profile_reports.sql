alter table public.customer_profiles
  add column if not exists medical_report_file_name text,
  add column if not exists medical_report_file_type text,
  add column if not exists medical_report_file_data text,
  add column if not exists medical_report_uploaded_at timestamptz;
