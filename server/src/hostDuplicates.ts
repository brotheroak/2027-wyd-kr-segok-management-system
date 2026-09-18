export type HostIdentity = {
  name: string;
  phone: string;
  address: string;
  addressDetail?: string;
};

const normalized = (value: string) => value.normalize("NFKC").replace(/\s+/gu, "").toLowerCase();
const phoneKey = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("82") ? `0${digits.slice(2).replace(/^0/, "")}` : digits;
};

export function isDuplicateHost(existing: HostIdentity, candidate: HostIdentity): boolean {
  const phone = phoneKey(candidate.phone);
  if (phone && phone === phoneKey(existing.phone)) return true;
  const name = normalized(candidate.name);
  const address = normalized(candidate.address);
  return Boolean(name && address
    && name === normalized(existing.name)
    && address === normalized(existing.address)
    && normalized(candidate.addressDetail ?? "") === normalized(existing.addressDetail ?? ""));
}
