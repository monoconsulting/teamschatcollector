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
  await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&scope=openId%20profile%20openid%20offline_access&redirect_uri=https%3A%2F%2Fteams.microsoft.com%2Fv2&client-request-id=019a342b-2132-7a17-83c4-469e73e18330&response_mode=fragment&response_type=code&x-client-SKU=msal.js.browser&x-client-VER=3.30.0&client_info=1&code_challenge=jiqdEEavkqvMLVXsfWIzO3Fzlzi9_68KZ8WDF2dpE0A&code_challenge_method=S256&nonce=019a342b-2134-7d5e-9346-4175d8737de8&state=eyJpZCI6IjAxOWEzNDJiLTIxMzMtNzA3OS05YTM5LWM1ZjZhOWRiYzk3YSIsIm1ldGEiOnsiaW50ZXJhY3Rpb25UeXBlIjoicmVkaXJlY3QifX0%3D%7Chttps%3A%2F%2Fteams.microsoft.com%2Fv2%2F%3Fenablemcasfort21%3Dtrue');
  await page.getByPlaceholder('Email, phone, or Skype').fill('mattias.cederlund@itcentrum.se');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('b9eVw37!BXBgNKZ');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.goto('https://teams.microsoft.com/v2/');
  await page.getByTestId('simple-collab-dnd-rail').getByText('ÖSTHAMMAR - SERVICEFÖNSTER').click();
  await page.getByTestId('simple-collab-dnd-rail').getByLabel('ÖSTHAMMAR - SERVICEFÖNSTER').locator('div').nth(4).click();
  await page.locator('#author-1761807685128').click();
  await page.getByText('0703016669', { exact: true }).click();
  await page.locator('#author-1761805944283').click();
  await page.getByText('There are currently no login servers available to service the logon request').click();
  await page.getByText('Urban Perjus').click();
  await page.getByText('Tack, då vet jag. Har uppdaterat vår webb med det.').click();
  await page.locator('#author-1761809770294').click();
  await page.getByText(':03 AMMattias Cederlundyes').click();
  await page.getByText('Urban PerjusFriday 1:12').click();
  await page.getByText('Gomiddag! Då är Östhammarsproblemet löst. Den var inte lätt - MTU-storleken för').click();
  await page.getByText('Tuesday, October').click();
  await page.getByText('Andreas Synning').click();
  await page.getByText('Jag undrar mest om vet är det viktigaste för en infrastrukturchef att göra idag').click();
  await page.getByText('Hm nu ska vi se vad det kan vara? Övervakningsserver kanske?').click();
  await page.locator('#author-1761810322509').click();
  await page.getByLabel('Today at 8:45 AM.').click();
  await page.getByText('Vad är det för hårdvara Mohammed ska köra idag från Östhammar till Skutskär?').click();
  await page.locator('#author-1761809831253').click();
  await page.getByLabel('Today at 8:37 AM.').click();
  await page.getByText('Synd.', { exact: true }).click();
  await page.getByText('Den får gå tillbaka', { exact: true }).click();
  await page.locator('#timestamp-1761809475661').click();
});