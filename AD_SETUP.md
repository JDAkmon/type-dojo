# Type Dojo AdSense setup

The intended audience is general teens and adults. One manual display unit sits below the Overview content, separate from lessons, battles, charts, library, progress, and information pages. No auto-refresh or popup placement is implemented.

## Current state

The site is in **verification** mode with public publisher ID `ca-pub-8628518362396901`. No ad-unit slot has been supplied and no ad script is requested. The companion [JDAkmon.github.io repository](https://github.com/JDAkmon/JDAkmon.github.io) supplies the domain-root landing page and ads.txt. The public IDs are configured in `src/ads-config.js`. They are not passwords; never put account tokens, payment information, or sign-in details in this repository.

## Connect the site

1. In AdSense, open **Sites → New site** and enter `jdakmon.github.io`, without `/type-dojo/` or a hash. Google allows sites on public-suffix platforms, and `github.io` is on the Public Suffix List. Final acceptance and review are Google's decision.
2. Send the public publisher ID from your account (`ca-pub-` followed by 16 digits). Use `mode: 'verification'` while approval and consent setup are pending. This adds the verification meta tag during the build without loading an ad script.
3. Run `npm run build:ad-root` to prepare `_adsense-root/index.html`, `ads.txt`, and `.nojekyll`. These belong at **https://jdakmon.github.io/**, supplied by the companion `JDAkmon.github.io` repository. Copy updates to that repository and push `main`. Do not put the only ads.txt at `/type-dojo/ads.txt`; Google's crawler expects the domain root. Preserve any future additional root content when updating these files.
4. Publish the verification changes, then choose the meta-tag verification method in AdSense. Request Google's site review. The app also has public [privacy](https://jdakmon.github.io/type-dojo/privacy.html) and [about/contact](https://jdakmon.github.io/type-dojo/about.html) pages.

## Create the placement and consent messages

1. Use **Ads → By ad unit → Display ads**. Name it `Type Dojo Overview`, select **Responsive**, and copy the `data-ad-slot` number. Keep Auto ads, anchor ads, and vignette ads off for this site; they would add placements outside the manual unit.
2. In **Privacy & messaging**, configure and publish Google's certified consent messages for the site, including the European regulations message and applicable US state messages. Use the privacy URL above. The code includes Google's callback-based privacy-settings link and leaves Google's default US opt-out links intact. A homemade cookie banner is not a substitute for a certified CMP.
3. Review the actual privacy disclosure, advertising vendors, audience settings, and rights to monetize third-party artwork before requesting ads. Pokémon asset credits do not themselves grant commercial-use rights. Google reviews content against its publisher policies; this repository does not certify approval or legal compliance.
4. Once the site is **Ready**, consent messages are published, and both public IDs are verified, set the real `homeSlotId`, `consentConfigured: true`, and `mode: 'live'`. The consent flag records that the provider setup is complete; it is **not** a visitor's consent decision. Google/CMP must handle individual choices.
5. Run `npm test` and `npm run build`, publish, and inspect the live Overview on desktop and mobile. Do not click your own ads. Ad blockers and no-fill responses may mean no ad is shown.

## Behavior

- `off`: no verification tag, ad script, or ad requests.
- `verification`: real publisher meta tag only; no ad script or ad requests.
- `live`: requests the manual unit only when both IDs and the consent-configuration flag are valid, the page is HTTPS, and Overview is visible. Localhost remains ad-free.
- The ad element lives outside the app's rerendered DOM. Changing generations, sprite settings, or navigating away and back does not request another ad in the same document. Script failure and no-fill collapse the placement.
- Turning `mode` back to `off` and publishing removes the integration on the next page load. Previously loaded third-party code cannot be unloaded without a page reload.

## References

- [Google: eligible site types](https://support.google.com/adsense/answer/12170421?hl=en)
- [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat)
- [Add and verify a site](https://support.google.com/adsense/answer/12169212?hl=en)
- [Root-level ads.txt](https://support.google.com/adsense/answer/12171612?hl=en)
- [Create a display unit](https://support.google.com/adsense/answer/9274025?hl=en)
- [Required privacy disclosures](https://support.google.com/adsense/answer/1348695?hl=en)
- [Certified consent requirements](https://support.google.com/adsense/answer/13554116?hl=en)
- [Google's privacy-message JavaScript API](https://developers.google.com/funding-choices/fc-api-docs)
- [Intellectual property policy](https://support.google.com/publisherpolicies/answer/10402772?hl=en)
