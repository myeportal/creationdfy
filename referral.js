(function () {
  const STORAGE_KEYS = {
    ref: 'creationdfy_ref',
    affiliateEmail: 'creationdfy_affiliate_email',
    affiliateCode: 'creationdfy_affiliate_code'
  };

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  async function sha256(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function makeAffiliateCode(email) {
    const normalized = normalizeEmail(email);
    const hash = await sha256(normalized + '|creationdfy|affiliate');
    return 'cdfy-' + hash.slice(0, 12);
  }

  function getRefFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  }

  function rememberRefFromUrl() {
    const ref = getRefFromUrl();
    if (ref) safeSet(STORAGE_KEYS.ref, ref);
  }

  function currentRef() {
    return getRefFromUrl() || safeGet(STORAGE_KEYS.ref) || '';
  }

  function appendRefToLinks() {
    const ref = currentRef();
    if (!ref) return;
    document.querySelectorAll('[data-ref-link="true"]').forEach(link => {
      try {
        const url = new URL(link.href, window.location.origin);
        url.searchParams.set('ref', ref);
        link.href = url.toString();
      } catch (_) {}
    });
  }

  async function setupAffiliatePortal() {
    const form = document.querySelector('[data-affiliate-form]');
    if (!form) return;
    const emailInput = form.querySelector('input[name="email"]');
    const output = document.querySelector('[data-affiliate-output]');
    const existingEmail = safeGet(STORAGE_KEYS.affiliateEmail);
    const existingCode = safeGet(STORAGE_KEYS.affiliateCode);

    function render(email, code) {
      if (!output) return;
      if (!email || !code) {
        output.innerHTML = '<p class="small">Enter your email to generate your Creation DFY referral link.</p>';
        return;
      }
      const base = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'https://creationdfy.com';
      const referralLink = base.replace(/\/$/, '') + '/apply.html?ref=' + encodeURIComponent(code);
      output.innerHTML = `
        <div class="portal-card">
          <div><strong>Email login:</strong> ${email}</div>
          <div style="margin-top:10px;"><strong>Your referral code:</strong> ${code}</div>
          <div style="margin-top:10px;"><strong>Your referral link:</strong><br><a href="${referralLink}">${referralLink}</a></div>
          <div style="margin-top:14px;" class="small">Commission: 25% of the initial sale only. Share your link and any buyer who comes through it will carry your referral code into the apply flow.</div>
        </div>
      `;
    }

    if (existingEmail && existingCode) {
      if (emailInput) emailInput.value = existingEmail;
      render(existingEmail, existingCode);
    } else {
      render('', '');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = normalizeEmail(emailInput ? emailInput.value : '');
      if (!email) return;
      const code = await makeAffiliateCode(email);
      safeSet(STORAGE_KEYS.affiliateEmail, email);
      safeSet(STORAGE_KEYS.affiliateCode, code);
      render(email, code);
    });
  }

  function setupReferralFill() {
    const ref = currentRef();
    const targets = document.querySelectorAll('[data-ref-input]');
    if (ref) targets.forEach(el => { el.value = ref; });
  }

  rememberRefFromUrl();
  document.addEventListener('DOMContentLoaded', () => {
    appendRefToLinks();
    setupReferralFill();
    setupAffiliatePortal();
  });
})();
