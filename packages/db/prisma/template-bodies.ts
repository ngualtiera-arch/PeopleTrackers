/**
 * Verbatim report template bodies — spec §13.1/§22.
 *
 * Extracted directly from the supplied sample report PDFs (skipreport.pdf, updatereport.pdf,
 * fieldcallreport.pdf — see docs/PeopleTrackers_V1_Build_Specification.md Appendix), which show
 * a real historical case (OUR REF 55418) with these bodies pasted into its Report field.
 * `located`, `leads_obtained` and `non_locate` are cross-confirmed identical across TWO
 * independent samples (skipreport.pdf and updatereport.pdf) — high confidence. `field_call` is
 * confirmed complete and self-contained from fieldcallreport.pdf.
 *
 * `process_service` has NO sample in the supplied material — spec §13.1 only describes it
 * vaguely as "service-of-documents result wording". Left empty rather than inventing content;
 * must be captured from the live TemplatesEdit screen before go-live.
 *
 * The trailing disclaimer block ("We also provide Surveillance...through...listed within this
 * report.") appears once, after the Non Locate / Search Result Notes / Legal Matters sections,
 * in both samples — attached here to `non_locate` as its tail. This is an inference from the
 * sample structure, not independently verified against the live TemplatesEdit screen.
 */
export const TEMPLATE_BODIES: Record<string, string> = {
  located: `REPORT SUMMARY

LOCATED RESULTS

Residential Address:
Mobile:
Date of Birth:
Email address:
Source / Method of Confirmation:

Further searches have identified the following information in relation to the subject:
`,

  leads_obtained: `LEADS OBTAINED

We have found a possible address for the subject at:


Unfortunately we have not been able to speak to anyone to verify if this is still correct. Based on this information we recommend a field call to the address.`,

  non_locate: `NOT LOCATED RESULTS

Last known address: We conducted searches on the last known address of:

Neighbours: We attempted to contact neighbours and found :

Phone numbers: We attempted to call the last known phone number:
-This number is disconnected or no longer current.
- Many attempts have been made during different days and times with messages left via text and voicemail with no response from the subject.

Last known email: We tried to contact the subject via email:
-There has been no response to date

Additional Details:


SEARCH RESULT NOTES

Electoral Roll Search
We conducted an Australian Electoral Search on the subjects name and possible related states on the file and found

-No results or exact name match

-Too many with the same name unable to determine which is the subject

Database Name search results
We conducted numerous National databases Searches under the subjects name and last known details and found the following listings:


Social Media / Internet Links
We Conducted a number of social media searches and internet search engine searches under the subjects name and found the following:

-We could not find a match for the subject due to no profile or too many with the same name.

Property Ownership Search
We performed title residential ownership searches on the subjects name and found:
Match / No listings

Rental applications Search
We performed rental application searches under the subjects name and found:

Employment Details / Business Information
During our searches / Investigation we found the following information regarding the subjects employment / business relations.

No abn or links to businesses found under the subjects name.
Could not find a direct employment or occupation for the subject.

Legal Matters
We ran the subjects name through the Australian Court database however found no listings / information for the subject and or the subjects name is too common and we are unable to provide an exact match.
---
We ran the subjects name through the Australian Court database however found the following information as their latest listing:

Date:
Listing Type:
Location:
Case Number:

We also provide Surveillance, Field Calls, and Process Serving services. If you require any of these services, please contact our office for a quote.

Please inform us if you have any further information that you think may assist us in locating this subject.

We recommend files to be reopen in 6 months to allow for new information if required.

*Please note that this report is valid for 30 days.
The information contained in this report has been obtained through searches of available databases and enquiries conducted during the course of the investigation. While all reasonable efforts have been made to ensure accuracy, sources at times may not be 100% accurate.
Clients are advised to independently verify all details prior to relying on the information for any purpose. No responsibility is accepted for any loss, damage, or consequences arising from the use of this information.

All appropriate precautions should be exercised when attempting to contact the subject or attending any address listed within this report.`,

  process_service: '',

  field_call: `Thank you for your instruction in this matter to serve Legal Documents on XXXXXX at the address XXXXXx

RESULT:  Served / Unserved / Information Obtained

Our agent attended the given address on XXXX at XXXXXXam/pm

Affidavit has been completed for this file and will be forwarded to your office.`,
};
