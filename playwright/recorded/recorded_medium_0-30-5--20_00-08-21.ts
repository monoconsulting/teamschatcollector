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
  await page.goto('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&scope=openId%20profile%20openid%20offline_access&redirect_uri=https%3A%2F%2Fteams.microsoft.com%2Fv2&client-request-id=019a323a-d56e-7c67-b63b-9c3c620fb7cb&response_mode=fragment&response_type=code&x-client-SKU=msal.js.browser&x-client-VER=3.30.0&client_info=1&code_challenge=VpyGCIQogb9FM4uUn1U8CvV3sUTaf8VvyXnkA8IQ230&code_challenge_method=S256&nonce=019a323a-d56e-78a4-a930-705ead58c0a9&state=eyJpZCI6IjAxOWEzMjNhLWQ1NmUtNzYzZC1iMTVhLTQ2MGJlMzRlY2U1MyIsIm1ldGEiOnsiaW50ZXJhY3Rpb25UeXBlIjoicmVkaXJlY3QifX0%3D%7Chttps%3A%2F%2Fteams.microsoft.com%2Fv2%2F%3Fenablemcasfort21%3Dtrue');
  await page.getByPlaceholder('Email, phone, or Skype').click();
  await page.getByPlaceholder('Email, phone, or Skype').click();
  await page.getByPlaceholder('Email, phone, or Skype').fill('mattias.cederlund@itcentrum.se');
  await page.getByPlaceholder('Email, phone, or Skype').press('Enter');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('b9eVw37!BXBgNKZ');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.goto('https://teams.microsoft.com/v2/');
  await page.getByTestId('simple-collab-dnd-rail').getByText('Stefan Stigsson').click();
  await page.getByTestId('simple-collab-dnd-rail').getByText('Stefan Stigsson').click();
  await page.getByLabel('Type a message').click();
  await page.getByTestId('simple-collab-dnd-rail').getByText('Samsourcing: Projektmöte').click();
  await page.getByTitle('Samsourcing: Projektmöte').click();
  await page.getByTestId('simple-collab-dnd-rail').getByText('Henrik Hietanen').click();
  await page.getByText('Zahid får lön från mig men Mohammed ska precis till att skriva över honom till').click();
  await page.getByText('ITC-SAM: Delprojektledarmöte').click();
  await page.getByTestId('simple-collab-dnd-rail').getByText('ITC-SAM: Delprojektledarmöte').click();
  await page.getByTestId('simple-collab-dnd-rail').getByLabel('ITC-SAM: Delprojektledarmöte').locator('div').first().click();
  await page.getByText('Men alla använder väl fram till o med ons kan jag tro då lärarna arbetar , sen').click();
});