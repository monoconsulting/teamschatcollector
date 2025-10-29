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
  await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&scope=openId%20profile%20openid%20offline_access&redirect_uri=https%3A%2F%2Fteams.microsoft.com%2Fv2&client-request-id=019a31c5-b3c1-72df-9077-c4dddb21ce51&response_mode=fragment&response_type=code&x-client-SKU=msal.js.browser&x-client-VER=3.30.0&client_info=1&code_challenge=JTugb6sYrddGNqZtcEYo_GefVCkFD4iWOqDutRW1w84&code_challenge_method=S256&nonce=019a31c5-b3c2-7f31-884a-1a10a4197aae&state=eyJpZCI6IjAxOWEzMWM1LWIzYzItN2NjOS04NjI3LTBkNGFmZGJkYzg0NyIsIm1ldGEiOnsiaW50ZXJhY3Rpb25UeXBlIjoicmVkaXJlY3QifX0%3D%7Chttps%3A%2F%2Fteams.microsoft.com%2Fv2%2F%3Fenablemcasfort21%3Dtrue');
  await page.getByPlaceholder('Email, phone, or Skype').click();
  await page.getByPlaceholder('Email, phone, or Skype').click();
  await page.getByPlaceholder('Email, phone, or Skype').fill('mattias.cederlund@itcentrum.se');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('b9eVw37!BXBgNKZ');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Don\'t show this again').click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.goto('https://teams.microsoft.com/v2/');
  await page.getByTestId('simple-collab-dnd-rail').getByText('ÖSTHAMMAR - SERVICEFÖNSTER').click();
  await page.getByText('det är bara hyper-v burkarna som man inte kan managera via vmm och det går inte').click();
  await page.locator('#author-1761770575936').click();
  await page.getByText('lagen om alltings j-vlighet', { exact: true }).click();
  await page.locator('#author-1761770470484').click();
  await page.locator('#timestamp-1761770470484').click();
  await page.getByText('nej va trist', { exact: true }).click();
  await page.locator('#timestamp-1761770453239').click();
  await page.getByText('Självklart har vmmservern krachat när det bara var 2 st dhcp servrar kvar vet').click();
  await page.locator('#author-1761770440072').click();
  await page.locator('#timestamp-1761770440072').click();
  await page.getByText('Får nog bli så.', { exact: true }).click();
  await page.locator('#author-1761770436876').click();
  await page.locator('#timestamp-1761770436876').click();
  await page.getByRole('group', { name: 'Mattias Cederlund kan man i v' }).click();
  await page.getByText('japp men dom hoppade direkt upp på 28 %. Så ja.. Vi får se. Verkar ju gå').click();
  await page.locator('#author-1761770361755').click();
  await page.locator('#timestamp-1761770361755').click();
  await page.getByText('i och för sig på 4 timmar', { exact: true }).click();
  await page.locator('#timestamp-1761770321343').click();
  await page.getByText('Mailservern och Filservern ser det dock rätt mörkt ut för. Ligger på 34 resp 40').click();
  await page.locator('#author-1761770280312').click();
  await page.locator('#timestamp-1761770280312').click();
  await page.getByText('Mycket bra!', { exact: true }).click();
  await page.locator('#timestamp-1761770197589').click();
  await page.getByText('Dom sista håller på', { exact: true }).click();
  await page.locator('#author-1761770181194').click();
  await page.locator('#timestamp-1761770181194').click();
  await page.getByText('Va bra! Har några fler ramlat över?', { exact: true }).click();
  await page.locator('#timestamp-1761770148054').click();
  await page.getByText('Det går framåt', { exact: true }).click();
  await page.locator('#author-1761770129726').click();
  await page.locator('#timestamp-1761770129726').click();
  await page.getByText('Har ni lyckats få över något?', { exact: true }).click();
  await page.getByLabel('Today at 9:34 PM.').click();
  await page.locator('#content-control-message-1761769854093').getByText('Recording started').click();
  await page.getByLabel('Recording has stopped.').getByText('Recording has stopped.').click();
  await page.getByText('Håller tummarna för att det släpper', { exact: true }).click();
  await page.getByLabel('Today at 7:40 PM.').click();
  await page.getByText('Det går sakta men säkert.. Filservern och Mailservern händer det knappt något').click();
  await page.locator('#author-1761763108166').click();
  await page.getByLabel('Today at 7:38 PM.').click();
  await page.getByText('Hur går det?', { exact: true }).click();
  await page.getByLabel('Today at 7:36 PM.').click();
});