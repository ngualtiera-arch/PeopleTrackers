/**
 * Confirmed business/branding details — spec §2.2, decision D5.
 * Seeded into `settings` at db-seed time; editable afterwards from the Settings screen.
 * Do not substitute the legacy iTrace ABN/ACN or any iTrace contact detail here — see §2.2 "Not to be used anywhere".
 */
export const CONFIRMED_BUSINESS_DETAILS = {
  legalName: 'SKIP TRACING AND LOCATIONS AUSTRALIA PTY LTD',
  tradingAs: 'People Trackers Australia',
  abn: '52 675822349',
  secondaryAbn: '', // Not in the confirmed set — omitted per D5 / §21. Leave empty unless the client supplies it.
  acn: '', // Not in the confirmed set — omitted per D5 / §21. Leave empty unless the client supplies it.
  email: 'admin@peopletrackers.com.au',
  website: 'www.peopletrackers.com.au',
  additionalWebsite: 'https://skiptracingserviceaustralia.com/',
  postalAddress: 'P O Box 86, Canterbury Victoria 3126 Australia',
  contactNumber: '1800053299',
  confidentialityLine: 'PRIVATE AND CONFIDENTIAL',
  officeByAppointmentLine: 'For security purposes our office address is made known by appointment only.',
} as const;
