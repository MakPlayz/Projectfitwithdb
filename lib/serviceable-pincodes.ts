export const DEFAULT_SERVICEABLE_PINCODES = [
  '530001',
  '530002',
  '530003',
  '530004',
  '530005',
  '530016',
  '530020',
  '530017',
  '530018',
  '530045',
  '530048',
  '530009',
  '530011',
  '530012',
  '530026',
  '530027',
  '530028',
  '530007',
  '530008',
  '530013',
  '530014',
  '530022',
  '530024',
  '530041',
  '530043',
  '530047',
  '530052',
  '530053',
  '530040',
  '530042',
  '530051',
  '530057',
  '530058',
  '530059',
  '531163',
  '531173',
];

let runtimeServiceablePincodes: string[] | null = null;

function normalizePincodeList(pincodes: string[]) {
  return Array.from(
    new Set(
      pincodes
        .map((pincode) => pincode.trim())
        .filter((pincode) => /^[1-9][0-9]{5}$/.test(pincode))
    )
  );
}

export function setRuntimeServiceablePincodes(pincodes: string[]) {
  const normalized = normalizePincodeList(pincodes);
  runtimeServiceablePincodes = normalized.length > 0 ? normalized : null;
}

export function getServiceablePincodes() {
  if (runtimeServiceablePincodes) {
    return runtimeServiceablePincodes;
  }

  const raw =
    process.env.SERVICEABLE_PINCODES ||
    process.env.NEXT_PUBLIC_SERVICEABLE_PINCODES ||
    '';

  const envPincodes = normalizePincodeList(raw.split(','));

  return envPincodes.length > 0 ? envPincodes : DEFAULT_SERVICEABLE_PINCODES;
}

export function isServiceablePincode(pincode: string) {
  const allowed = getServiceablePincodes();

  if (allowed.length === 0) {
    return true;
  }

  return allowed.includes(pincode.trim());
}
