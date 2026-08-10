/**
 * Verbatim report template bodies — spec §13.1/§22.
 *
 * Round 1 extracted from the supplied sample report PDFs (skipreport.pdf, updatereport.pdf,
 * fieldcallreport.pdf), showing a real historical case (OUR REF 55418) with these bodies pasted
 * into its Report field.
 *
 * Round 2 — a direct screenshot of the live TemplatesEdit screen (Filemaker "Layout" folder,
 * templates.pdf) plus three more real completed reports for the SAME case (55418) reusing the
 * `field_call` button. This resolved two real bugs from round 1:
 *
 *   - `field_call` and `process_service` were swapped. The "serve Legal Documents... Affidavit"
 *     text (round 1's `field_call`) is actually Process Service — TemplatesEdit's own "Field
 *     Call" button, independently confirmed by THREE separate real report samples in round 2
 *     (file update.pdf, print file report.pdf, and TemplatesEdit itself), is "perform a field
 *     call... RESULT: Confirmed / Unconfirmed / Relocated / Information Obtained".
 *   - `leads_obtained` had drifted from the current master wording — TemplatesEdit is the
 *     button's actual live source, so it wins over the one historical case's saved (and
 *     possibly hand-edited) report text.
 *
 * `located` and `non_locate` are unchanged — TemplatesEdit's "Skip Trace Report" matches round
 * 1's `located` almost verbatim, re-confirming it.
 *
 * TemplatesEdit also shows a "Quick Search Report" button/body that isn't one of the five
 * buttons actually used (confirmed separately, on camera, narrating exactly five) — left out
 * deliberately, not a missing sixth template.
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

  leads_obtained: `Thank you for your instructions regarding this matter. We have conducted thorough searches based on the information you provided, utilising all available databases and making numerous phone inquiries in an effort to establish a new address for the subject. Unfortunately, we have not yet succeeded in confirming a new address.

During our investigation, we identified a possible address for the subject at XXXXXXXXX.

However, we cannot confirm that this is the correct individual, as we have not been able to verify the date of birth or previous details.

We recommend conducting a field call to further investigate this information.`,

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

  process_service: `Thank you for your instruction in this matter to serve Legal Documents on XXXXXX at the address XXXXXx

RESULT:  Served / Unserved / Information Obtained

Our agent attended the given address on XXXX at XXXXXXam/pm

Affidavit has been completed for this file and will be forwarded to your office.`,

  field_call: `Thank you for your instruction in this matter to perform a field call on XXXXXX at the address XXXXXx

RESULT: Confirmed / Unconfirmed / Relocated / Information Obtained

Our agent attended the given address on XXXX at XXXXXXam/pm`,
};
