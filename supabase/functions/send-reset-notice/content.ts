export const LOGIN_URL = 'https://chairrock.app/login?forgot=1'
const DEADLINE = 'Friday, October 30'

export const SUBJECTS = {
  initial: 'Please reset your CRIC password by Friday, Oct 30',
  reminder: 'Reminder: please reset your CRIC password by Friday, Oct 30',
} as const

const steps = {
  text: `1. Go to ${LOGIN_URL}
2. Enter this email address and tap "Send reset link."
3. Open the email from CRIC and choose a new password. That link works for one hour, but you can always request a new one from the same page.`,
  html: `<ol>
<li>Go to <a href="${LOGIN_URL}">${LOGIN_URL}</a></li>
<li>Enter this email address and tap &ldquo;Send reset link.&rdquo;</li>
<li>Open the email from CRIC and choose a new password. That link works for one hour, but you can always request a new one from the same page.</li>
</ol>`,
}

export function buildEmail(kind: 'initial' | 'reminder') {
  const intro = kind === 'initial'
    ? "As we discussed at the annual meeting, we're asking every member to set a new password for the CRIC app. You already have an account under this email address, even if you've never signed in."
    : "This is a quick reminder that we're asking every member to set a new password for the CRIC app. Our records show you haven't done it yet. You already have an account under this email address, even if you've never signed in."
  const text = `Hi,

${intro}

${steps.text}

Please do this by ${DEADLINE}. If you run into any trouble, just reply to this email.

Thanks,
CRIC
`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c1917;max-width:560px">
<p>Hi,</p>
<p>${intro.replaceAll("'", '&rsquo;')}</p>
${steps.html}
<p>Please do this by <strong>${DEADLINE}</strong>. If you run into any trouble, just reply to this email.</p>
<p>Thanks,<br>CRIC</p>
</div>`
  return { subject: SUBJECTS[kind], text, html }
}
