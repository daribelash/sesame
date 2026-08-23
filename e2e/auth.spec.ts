import { test, expect } from '@playwright/test'

test('register through the first-run flow, log out, and log back in', async ({ page }) => {
  const email = `driver-${Date.now()}@example.com`
  const password = 'correct horse battery staple'

  await page.goto('/')

  // First-run: splash → register (step 1 of 3) → save-first-gate (skipped,
  // step 2 of 3) → confirmation (step 3 of 3) → home.
  await expect(
    page.getByRole('heading', { name: 'Never dig for a gate code again.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Get started' }).click()
  await expect(page.getByText('Step 1 of 3')).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByRole('heading', { name: 'Save your first gate' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this step' }).click()
  await expect(page.getByRole('heading', { name: "You're all set." })).toBeVisible()
  await page.getByRole('button', { name: 'Enter Sesame' }).click()

  await expect(page.getByRole('heading', { name: 'Your gates' })).toBeVisible()

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()

  // A returning login skips straight to "Welcome back," no save-gate step.
  await expect(
    page.getByRole('heading', { name: 'Never dig for a gate code again.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'I already have an account' }).click()
  await expect(page.getByText('Step 1 of 3')).not.toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.getByRole('button', { name: 'Enter Sesame' }).click()

  await expect(page.getByRole('heading', { name: 'Your gates' })).toBeVisible()
})
