import { test, expect } from '@playwright/test'

test('register, log out, and log back in', async ({ page }) => {
  const email = `driver-${Date.now()}@example.com`
  const password = 'correct horse battery staple'

  await page.goto('/')

  // Auth is a separate screen, not stacked on the gate list.
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.getByRole('button', { name: 'Need an account? Register' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
})
