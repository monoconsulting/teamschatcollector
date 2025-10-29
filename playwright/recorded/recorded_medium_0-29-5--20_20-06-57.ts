import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1600
  }
});

test('test', async ({ page }) => {
  await page.goto('https://teams.microsoft.com/v2/?clientexperience=t2');
  await page.goto('https://teams.microsoft.com/v2/');
  await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&scope=openId%20profile%20openid%20offline_access&redirect_uri=https%3A%2F%2Fteams.microsoft.com%2Fv2&client-request-id=019a315d-d62d-7146-9990-66679903f113&response_mode=fragment&response_type=code&x-client-SKU=msal.js.browser&x-client-VER=3.30.0&client_info=1&code_challenge=kILoL1jq2uGNMLopRir09pvkqz3GWOXATTK-u6h44Zc&code_challenge_method=S256&nonce=019a315d-d62e-707f-85ce-cb16de3c9635&state=eyJpZCI6IjAxOWEzMTVkLWQ2MmUtN2M2MC1iODM5LWY3MmQzNjYwNzM2NCIsIm1ldGEiOnsiaW50ZXJhY3Rpb25UeXBlIjoicmVkaXJlY3QifX0%3D%7Chttps%3A%2F%2Fteams.microsoft.com%2Fv2%2F%3Fenablemcasfort21%3Dtrue');
  await page.getByLabel('Enter your email, phone, or').fill('mattias.cederlund@itcentrum.se');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('b9eVw37!BXBgNKZ');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.goto('https://teams.microsoft.com/v2/');
  await page.locator('#chat-pane-list').click();
  await page.getByTitle('ÖSTHAMMAR - SERVICEFÖNSTER').click();
  await page.locator('[id="chat-header-19\\:meeting_NjliOGI4MGEtZWM5Yi00YzhmLWEwZmQtYjIwMDA2NDMxODNl\\@thread\\.v2"] > div > div > div > div:nth-child(2) > div').click();
  await page.getByTestId('simple-collab-dnd-rail').getByText('Stefan Stigsson').click();
  await page.locator('div').filter({ hasText: /^Vet du nåt om addsecure och swedlock\? Är det interna system\?$/ }).first().click();
  await page.locator('div').filter({ hasText: /^Ja precis$/ }).first().click();
  await page.getByText('Stefan Stigsson10:46 AM').click();
  await page.locator('div').filter({ hasText: /^men den har vi väl en full backup på så vi kan starta med inkrementell\?$/ }).first().click();
  await page.getByText('En full backup av filservern tog 19 timmar så du vet.').click();
  await page.getByText('Hej.', { exact: true }).click();
  await page.locator('#author-1761730450639').click();
  await page.getByLabel('Today at 10:34 AM.').click();
  await page.getByText('Dunder!!', { exact: true }).click();
  await page.locator('#timestamp-1761640788528').click();
  await page.getByText('okej. Jag skriver upp det', { exact: true }).click();
  await page.locator('#author-1761640784522').click();
  await page.locator('#timestamp-1761640784522').click();
  await page.getByText('japp! Du får gå när du behöver. Söndagen vet vi ju inget om men....ja risken är').click();
  await page.locator('#timestamp-1761640773245').click();
  await page.getByText('För min del.', { exact: true }).click();
  await page.getByText('Okej så från lördag kl 08 typ till ca 15:30?').click();
  await page.locator('#author-1761640749331').click();
  await page.locator('#timestamp-1761640749331').click();
  await page.getByText('...och lördag morgon ska vi testa alla interna system').click();
  await page.getByText('dagtid lördag söndag är alldeles jättebra! Skriv upp det! Ja det är dagtid - vi').click();
  await page.locator('#timestamp-1761640693130').click();
  await page.getByText('Men det kanske är dagtid som gäller?', { exact: true }).click();
  await page.getByText('Det vet jag inte haha. Lördag kväll har jag köpt biljetter till Horror nights i').click();
  await page.locator('#author-1761640640265').click();
  await page.locator('#timestamp-1761640640265').click();
  await page.getByText('har du möjlighet så vore det väldigt bra - jag tror du kan fixa till saker lite').click();
  await page.getByText('nej det känns osäkert', { exact: true }).click();
  await page.locator('#timestamp-1761640525054').click();
  await page.getByText('Skulle räcka med Jeanette och B-G sa hon igår').click();
  await page.locator('#author-1761640506599').click();
  await page.locator('#timestamp-1761640506599').click();
});