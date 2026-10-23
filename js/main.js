/**
 * DISCOVA - Main JavaScript
 * Interactive functionality: Category filtering, Live Search, Upvoting, Video Modal, Submissions,
 * Product Details interactions, Universal Theme Switcher (Dark & Light Mode).
 */

// Universal Theme Switcher
function applyTheme(theme, notify) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  if (theme === 'light') {
    document.body?.classList.add('light-mode');
  } else {
    document.body?.classList.remove('light-mode');
  }
  try {
    localStorage.setItem('discova_theme', theme);
  } catch (e) {}

  if (notify && typeof window.showToastMessage === 'function') {
    window.showToastMessage(theme === 'light' ? '☀️ Switched to Light mode' : '🌙 Switched to Dark mode');
  }
}

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-bs-theme') || localStorage.getItem('discova_theme') || 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  applyTheme(target, true);
};

window.setTheme = function(theme) {
  applyTheme(theme, true);
};

// Immediate application
(function() {
  const saved = localStorage.getItem('discova_theme') || 'dark';
  document.documentElement.setAttribute('data-bs-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {
  // Ensure body class is synchronized
  const activeTheme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
  if (activeTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  // Modal Helpers (Works with Bootstrap JS & standalone vanilla fallback)
  function showModal(modalEl) {
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
      const inst = bootstrap.Modal.getOrCreateInstance(modalEl);
      inst.show();
    } else {
      modalEl.classList.add('show');
      modalEl.setAttribute('aria-hidden', 'false');
    }
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    if (window.bootstrap && window.bootstrap.Modal) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
      else modalEl.classList.remove('show');
    } else {
      modalEl.classList.remove('show');
      modalEl.setAttribute('aria-hidden', 'true');
    }
  }

  // Universal Dynamic Toast Helper
  window.showToastMessage = function(message) {
    let toastEl = document.getElementById('generalToast') || document.getElementById('submissionToast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'generalToast';
      toastEl.className = 'toast align-items-center border-0';
      toastEl.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; background: #0F172A; color: #FFFFFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); padding: 12px 18px; font-size: 0.875rem; transition: opacity 0.3s ease;';
      toastEl.innerHTML = '<div class="d-flex align-items-center justify-content-between"><div class="toast-body fw-medium">' + message + '</div><button type="button" class="btn btn-link text-white-50 p-0 ms-3 text-decoration-none" onclick="this.closest(\'#generalToast\').remove()">✕</button></div>';
      document.body.appendChild(toastEl);
      setTimeout(() => {
        if (toastEl && toastEl.parentElement) toastEl.remove();
      }, 3500);
      return;
    }
    const bodyEl = toastEl.querySelector('.toast-body');
    if (bodyEl) bodyEl.textContent = message;

    if (window.bootstrap && window.bootstrap.Toast) {
      const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
      toast.show();
    } else {
      toastEl.style.display = 'block';
      toastEl.style.opacity = '1';
      setTimeout(() => {
        toastEl.style.display = 'none';
      }, 3500);
    }
  };


  // Dismiss modal handlers
  document.querySelectorAll('[data-bs-dismiss="modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      hideModal(modal);
    });
  });

  // Close modal when clicking backdrop
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  });

  // Modal open triggers
  document.querySelectorAll('[data-bs-toggle="modal"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSelector = btn.getAttribute('data-bs-target');
      if (targetSelector) {
        const targetModal = document.querySelector(targetSelector);
        if (targetModal) showModal(targetModal);
      }
    });
  });

  // Dynamic Authentication State for Navbar across all platform pages
  function initNavbarAuthState() {
    const user = (window.DiscovaAPI && typeof window.DiscovaAPI.getCurrentUser === 'function')
      ? window.DiscovaAPI.getCurrentUser()
      : (function() {
          try { return JSON.parse(localStorage.getItem('discova_user')); } catch (e) { return null; }
        })();

    if (!user) return;

    const signinLinks = document.querySelectorAll('a[href="login.html"]');
    signinLinks.forEach(link => {
      const container = document.createElement('div');
      container.className = 'dropdown d-inline-block discova-user-nav-dropdown';
      const avatarSrc = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4F46E5&color=fff&size=64`;
      
      container.innerHTML = `
        <button class="btn btn-sm d-flex align-items-center gap-2 rounded-pill px-2 py-1 text-decoration-none dropdown-toggle border-0" 
                style="background: rgba(79, 70, 229, 0.15); color: #818CF8; font-weight: 600;" 
                type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <img src="${avatarSrc}" class="rounded-circle" width="24" height="24" style="object-fit: cover;" alt="${user.name}">
          <span class="small d-none d-md-inline text-truncate" style="max-width: 100px;">${(user.name || 'Builder').split(' ')[0]}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg" style="min-width: 210px; border-radius: 12px; padding: 8px;">
          <li class="px-3 py-2 border-bottom border-secondary border-opacity-25 mb-1">
            <div class="fw-bold small text-body">${user.name || 'Builder'}</div>
            <div class="text-muted text-truncate" style="font-size: 0.725rem;">${user.role || user.email}</div>
          </li>
          <li>
            <a class="dropdown-item py-2 small d-flex align-items-center gap-2 rounded-2" href="submit.html">
              <span>🚀</span> Submit Product
            </a>
          </li>
          ${user.is_admin ? `
          <li>
            <a class="dropdown-item py-2 small d-flex align-items-center gap-2 rounded-2 text-warning fw-semibold" href="admin.html">
              <span>🛡️</span> Admin Portal
            </a>
          </li>
          ` : ''}
          <li><hr class="dropdown-divider my-1 border-secondary border-opacity-25"></li>
          <li>
            <a class="dropdown-item py-2 small text-danger d-flex align-items-center gap-2 rounded-2" href="javascript:void(0)" id="navSignOutBtn">
              <span>🚪</span> Sign Out
            </a>
          </li>
        </ul>
      `;

      const signOutBtn = container.querySelector('#navSignOutBtn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.DiscovaAPI && typeof window.DiscovaAPI.logout === 'function') {
            window.DiscovaAPI.logout();
          } else {
            localStorage.removeItem('discova_user');
            localStorage.removeItem('discova_token');
            window.location.reload();
          }
        });
      }

      if (link.parentNode) {
        link.parentNode.replaceChild(container, link);
      }
    });
  }

  initNavbarAuthState();

  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.site-navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('navbar-scrolled');
        navbar.style.background = 'rgba(6, 7, 11, 0.94)';
        navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
      } else {
        navbar.classList.remove('navbar-scrolled');
        navbar.style.background = 'rgba(6, 7, 11, 0.82)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // 2. Upvote Counter Interaction (Global across home and product details)
  const upvoteButtons = document.querySelectorAll('.upvote-badge-btn');
  upvoteButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const countEl = btn.querySelector('.upvote-count');
      if (!countEl) return;

      let currentCount = parseInt(countEl.textContent.trim().replace(/,/g, ''), 10) || 0;
      const isUpvoted = btn.classList.contains('upvoted');

      if (!isUpvoted) {
        btn.classList.add('upvoted');
        countEl.textContent = (currentCount + 1).toLocaleString();
        btn.style.transform = 'scale(1.12)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 200);
        showToastMessage('▲ Upvoted! Thank you for supporting African builders.');
      } else {
        btn.classList.remove('upvoted');
        countEl.textContent = Math.max(0, currentCount - 1).toLocaleString();
      }
    });
  });

  // 3. Category Pill & Timeframe Filtering on Homepage
  // NOTE: Fully handled dynamically in hydrateIndexPage() using live API data and event delegation.

  // 6. Video Modal Trigger & Player
  const videoModalEl = document.getElementById('videoPlayerModal');
  const videoFrame = document.getElementById('videoPlayerIframe');
  const videoTitleModal = document.getElementById('videoModalTitle');
  const videoDescModal = document.getElementById('videoModalDesc');

  const videoTriggers = document.querySelectorAll('[data-video-url]');
  videoTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const videoUrl = trigger.getAttribute('data-video-url');
      const title = trigger.getAttribute('data-video-title');
      const desc = trigger.getAttribute('data-video-desc');

      if (videoFrame) videoFrame.src = videoUrl;
      if (videoTitleModal) videoTitleModal.textContent = title || 'Founder Interview';
      if (videoDescModal) videoDescModal.textContent = desc || '';
    });
  });

  if (videoModalEl) {
    videoModalEl.addEventListener('hidden.bs.modal', () => {
      if (videoFrame) videoFrame.src = '';
    });
  }

  // 7. Product Submission Form Validation & Success Toast
  const submitForm = document.getElementById('submitProductForm');
  if (submitForm) {
    submitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalEl = document.getElementById('submitProductModal');
      hideModal(modalEl);
      showToastMessage('🎉 Product submitted successfully! Our editorial team will review it shortly.');
      submitForm.reset();
    });
  }

  // 8. Newsletter Subscription
  const newsletterForms = document.querySelectorAll('.newsletter-form');
  newsletterForms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value) {
        const btn = form.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Subscribed! ✓';
        btn.style.background = '#22C55E';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          input.value = '';
        }, 3000);
      }
    });
  });

  // 9. Product Details: Save / Bookmark Button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const isSaved = saveBtn.classList.toggle('saved');
      if (isSaved) {
        saveBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        saveBtn.style.borderColor = '#FFFFFF';
        saveBtn.querySelector('span').textContent = 'Saved';
        showToastMessage('🔖 Saved to your personal library.');
      } else {
        saveBtn.style.background = '';
        saveBtn.style.borderColor = '';
        saveBtn.querySelector('span').textContent = 'Save';
        showToastMessage('Removed from bookmarks.');
      }
    });
  }

  // 10. Product Details: Share Button
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: 'Pxxl on Discova',
        text: 'Check out Pxxl — Africa-first cloud deployment for developers on Discova!',
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          // Fallback to clipboard
          navigator.clipboard.writeText(window.location.href);
          showToastMessage('🔗 Link copied to clipboard!');
        }
      } else {
        navigator.clipboard.writeText(window.location.href);
        showToastMessage('🔗 Link copied to clipboard!');
      }
    });
  }

  // 11. Product Details: Copy CLI command
  const copyCliBtn = document.getElementById('copyCliBtn');
  if (copyCliBtn) {
    copyCliBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('npx pxxl deploy');
      const originalText = copyCliBtn.textContent;
      copyCliBtn.textContent = 'Copied! ✓';
      copyCliBtn.style.color = '#34D399';
      setTimeout(() => {
        copyCliBtn.textContent = originalText;
        copyCliBtn.style.color = '';
      }, 2500);
      showToastMessage('📋 Copied "npx pxxl deploy" to clipboard.');
    });
  }

  // 12. Product Details: Claim Listing Form
  const claimForm = document.getElementById('claimListingForm');
  if (claimForm) {
    claimForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalEl = document.getElementById('claimListingModal');
      hideModal(modalEl);
      showToastMessage('✉️ Verification link sent to your work email. Please check your inbox.');
      claimForm.reset();
    });
  }

  // 13. Dashboard Carousel Indicator Dots
  const cDots = document.querySelectorAll('.carousel-dots .c-dot');
  cDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      cDots.forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      
      const deploymentTable = document.querySelector('.deployments-table');
      if (deploymentTable) {
        deploymentTable.style.opacity = '0.4';
        setTimeout(() => {
          deploymentTable.style.opacity = '1';
        }, 150);
      }
    });
  });
});

  // ========================================================================
  // Submit Flow JavaScript Interactions
  // ========================================================================
  const productNameInput = document.getElementById('productNameInput');
  const nameCharCount = document.getElementById('nameCharCount');
  const previewBrandTitle = document.getElementById('previewBrandTitle');
  const previewSubName = document.getElementById('previewSubName');
  const previewMiniLogo = document.getElementById('previewMiniLogo');
  const scrapedMetaIcon = document.getElementById('scrapedMetaIcon');
  const scrapedMetaTitle = document.getElementById('scrapedMetaTitle');

  if (productNameInput) {
    productNameInput.addEventListener('input', () => {
      const val = productNameInput.value.trim() || 'Your Product';
      const firstLetter = val.charAt(0).toUpperCase() || 'P';

      if (nameCharCount) nameCharCount.textContent = `${productNameInput.value.length} / 40`;
      if (previewBrandTitle) previewBrandTitle.textContent = val;
      if (previewSubName) previewSubName.textContent = val;
      if (previewMiniLogo) previewMiniLogo.textContent = firstLetter;
      if (scrapedMetaIcon) scrapedMetaIcon.textContent = firstLetter;
      if (scrapedMetaTitle) scrapedMetaTitle.textContent = `We found: ${val} — African Tech`;
    });
  }

  // Website Input validation simulation
  const websiteInput = document.getElementById('websiteInput');
  const validationBannerText = document.getElementById('validationBannerText');
  if (websiteInput) {
    websiteInput.addEventListener('input', () => {
      try {
        let urlText = websiteInput.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (validationBannerText && urlText) {
          validationBannerText.textContent = `No existing listing for ${urlText} — you're good to go.`;
        }
      } catch (e) {}
    });
  }

  // Radio card selectors
  function setupRadioCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = container.querySelectorAll('.radio-card-option');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');

        const val = card.getAttribute('data-value');
        if (val === 'not-live') {
          showToastMessage('⚠️ Note: Discova requires a working live product or open beta to list.');
        }
      });
    });
  }

  setupRadioCards('relationshipOptions');
  setupRadioCards('isLiveOptions');
  setupRadioCards('pricingOptions');

  // Multi-step 4-Step Submit Wizard
  const nextStepBtn = document.getElementById('nextStepBtn');
  const prevStepBtn = document.getElementById('prevStepBtn');
  const trackSubmissionLink = document.getElementById('trackSubmissionLink');
  const step2TopBar = document.getElementById('step2TopBar');
  const step1Fields = document.getElementById('step1Fields');
  const step2Fields = document.getElementById('step2Fields');
  const step3Fields = document.getElementById('step3Fields');
  const step4Fields = document.getElementById('step4Fields');
  const currentStepTag = document.getElementById('currentStepTag');
  const currentStepTitle = document.getElementById('currentStepTitle');
  const currentStepDesc = document.getElementById('currentStepDesc');
  const draftStatusText = document.getElementById('draftStatusText');

  const stepIndicators = [
    document.getElementById('stepIndicator1'),
    document.getElementById('stepIndicator2'),
    document.getElementById('stepIndicator3'),
    document.getElementById('stepIndicator4')
  ];

  let currentStep = 1;

  window.goToStep = function(targetStep) {
    if (targetStep < 1 || targetStep > 4) return;
    currentStep = targetStep;

    const containers = [step1Fields, step2Fields, step3Fields, step4Fields];
    containers.forEach((cnt, idx) => {
      if (!cnt) return;
      if (idx + 1 === currentStep) {
        cnt.style.display = 'block';
        cnt.style.opacity = '0';
        setTimeout(() => {
          cnt.style.transition = 'opacity 0.25s ease';
          cnt.style.opacity = '1';
        }, 15);
      } else {
        cnt.style.display = 'none';
      }
    });

    // Update Indicators
    stepIndicators.forEach((ind, idx) => {
      if (!ind) return;
      ind.classList.remove('active', 'completed');
      if (idx + 1 < currentStep) {
        ind.classList.add('completed');
      } else if (idx + 1 === currentStep) {
        ind.classList.add('active');
      }
    });

    // Step 2 Header bar visibility
    if (step2TopBar) {
      step2TopBar.style.display = currentStep === 2 ? 'flex' : 'none';
    }

    // Navigation buttons & links
    if (trackSubmissionLink) {
      trackSubmissionLink.style.display = currentStep === 1 ? 'inline-block' : 'none';
    }
    if (prevStepBtn) {
      prevStepBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    }

    // Step specific titles and CTA texts
    if (currentStep === 1) {
      if (currentStepTag) currentStepTag.textContent = 'STEP 1 OF 4';
      if (currentStepTitle) currentStepTitle.textContent = 'Tell us what you built';
      if (currentStepDesc) {
        currentStepDesc.style.display = 'block';
        currentStepDesc.textContent = 'Takes about 5 minutes. Your progress saves automatically.';
      }
      if (draftStatusText) draftStatusText.textContent = '';
      if (nextStepBtn) {
        nextStepBtn.className = 'btn-action-primary';
        nextStepBtn.querySelector('span').textContent = 'Continue to Details';
      }
    } else if (currentStep === 2) {
      if (currentStepTag) currentStepTag.textContent = 'STEP 2 OF 4';
      if (currentStepTitle) currentStepTitle.textContent = 'Product details';
      if (currentStepDesc) currentStepDesc.style.display = 'none';
      if (draftStatusText) draftStatusText.textContent = 'Saved as draft';
      if (nextStepBtn) {
        nextStepBtn.className = 'btn-action-primary';
        nextStepBtn.querySelector('span').textContent = 'Continue to Builder';
      }
    } else if (currentStep === 3) {
      if (currentStepTag) currentStepTag.textContent = 'STEP 3 OF 4';
      if (currentStepTitle) currentStepTitle.textContent = 'Who’s building it?';
      if (currentStepDesc) {
        currentStepDesc.style.display = 'block';
        currentStepDesc.textContent = 'Real people behind real products. This is what makes a Discova listing trustworthy.';
      }
      if (draftStatusText) draftStatusText.textContent = 'Saved as draft';
      if (nextStepBtn) {
        nextStepBtn.className = 'btn-action-primary';
        nextStepBtn.querySelector('span').textContent = 'Continue to Review';
      }
    } else if (currentStep === 4) {
      if (currentStepTag) currentStepTag.textContent = 'STEP 4 OF 4';
      if (currentStepTitle) currentStepTitle.textContent = 'Review and submit';
      if (currentStepDesc) {
        currentStepDesc.style.display = 'block';
        currentStepDesc.textContent = 'Check everything looks right. You can still edit after submitting, until review starts.';
      }
      if (draftStatusText) draftStatusText.textContent = '';
      if (nextStepBtn) {
        nextStepBtn.className = 'btn btn-primary rounded-pill px-4 fw-bold text-white';
        nextStepBtn.querySelector('span').textContent = 'Submit for review';
      }
    }
  };

  if (nextStepBtn) {
    nextStepBtn.addEventListener('click', async () => {
      if (currentStep < 4) {
        goToStep(currentStep + 1);
        showToastMessage(`✓ Step ${currentStep - 1} saved.`);
      } else {
        const prodName = document.getElementById('productNameInput')?.value || 'New African Product';
        const tagline = document.getElementById('taglineInput')?.value || 'Modern web software';
        const desc = document.getElementById('descriptionInput')?.value || tagline;
        const website = document.getElementById('websiteInput')?.value || '';

        nextStepBtn.disabled = true;
        const spanEl = nextStepBtn.querySelector('span');
        if (spanEl) spanEl.textContent = 'Submitting to database...';

        if (window.DiscovaAPI) {
          try {
            const res = await window.DiscovaAPI.submitProduct({
              productName: prodName,
              tagline: tagline,
              description: desc,
              websiteUrl: website,
              makerName: 'Verified African Maker',
              makerEmail: 'maker@africanproducts.dev'
            });

            if (res && res.success) {
              showToastMessage('🎉 Product submitted to database! Loading confirmation...');
              setTimeout(() => {
                window.location.href = `submit-success.html?id=${res.submissionId}&name=${encodeURIComponent(prodName)}`;
              }, 600);
              return;
            }
          } catch (e) {
            console.warn('Submission error:', e);
          }
        }

        showToastMessage('🎉 Submission received! Loading confirmation...');
        setTimeout(() => {
          window.location.href = `submit-success.html?name=${encodeURIComponent(prodName)}`;
        }, 600);
      }
    });
  }

  if (prevStepBtn) {
    prevStepBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  }

  // Step 2 Character counters
  const taglineInput = document.getElementById('taglineInput');
  const taglineCharCount = document.getElementById('taglineCharCount');
  const previewDescText = document.getElementById('previewDescText');
  if (taglineInput) {
    taglineInput.addEventListener('input', () => {
      if (taglineCharCount) taglineCharCount.textContent = `${taglineInput.value.length} / 60`;
      if (previewDescText) previewDescText.textContent = taglineInput.value || 'One-line description of what your product does.';
    });
  }

  const descriptionInput = document.getElementById('descriptionInput');
  const descCharCount = document.getElementById('descCharCount');
  if (descriptionInput && descCharCount) {
    descriptionInput.addEventListener('input', () => {
      descCharCount.textContent = `${descriptionInput.value.length} / 1000`;
    });
  }

  // Step 2 Tag chips click toggle
  const tagChips = document.querySelectorAll('.tag-chip');
  tagChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const statusSpan = chip.querySelector('.chip-status');
      if (statusSpan) {
        statusSpan.textContent = chip.classList.contains('active') ? '✓' : '+';
      }
    });
  });

  // Country & Category live preview synchronization
  const countryInput = document.getElementById('countryInput');
  const countrySelect = document.getElementById('countrySelect');
  const categorySelect = document.getElementById('categorySelect');
  const previewMetaLocation = document.getElementById('previewMetaLocation');

  function updateMetaLocation() {
    if (previewMetaLocation) {
      const c = countrySelect ? countrySelect.value : (countryInput ? countryInput.value : 'Nigeria');
      const cat = categorySelect ? categorySelect.value : 'Hosting';
      previewMetaLocation.textContent = `${c} • ${cat}`;
    }
  }

  if (countryInput) countryInput.addEventListener('input', updateMetaLocation);
  if (countrySelect) countrySelect.addEventListener('change', updateMetaLocation);
  if (categorySelect) categorySelect.addEventListener('change', updateMetaLocation);

  const compareInput = document.getElementById('compareInput');
  const previewMetaCompare = document.getElementById('previewMetaCompare');
  if (compareInput && previewMetaCompare) {
    compareInput.addEventListener('input', () => {
      previewMetaCompare.textContent = compareInput.value;
    });
  }

  // ========================================================================
  // Global Video Modal Opener
  // ========================================================================
  window.openStoryVideo = function(title, desc, url) {
    const modalEl = document.getElementById('videoPlayerModal');
    const iframe = document.getElementById('videoPlayerIframe');
    const titleEl = document.getElementById('videoModalTitle');
    const descEl = document.getElementById('videoModalDesc');

    if (iframe) iframe.src = url || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
    if (titleEl) titleEl.textContent = title || 'Founder Interview';
    if (descEl) descEl.textContent = desc || '';

    if (modalEl) {
      if (window.bootstrap && window.bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      } else {
        modalEl.classList.add('show');
        modalEl.style.display = 'block';
      }
    }
  };

  // Reset video iframe on modal close
  const globalVideoModal = document.getElementById('videoPlayerModal');
  if (globalVideoModal) {
    globalVideoModal.addEventListener('hidden.bs.modal', () => {
      const iframe = document.getElementById('videoPlayerIframe');
      if (iframe) iframe.src = '';
    });
  }

  // Global Upvote Click Handler
  window.handleUpvote = function(btn, baseCount) {
    if (!btn) return;
    const countEl = btn.querySelector('.upvote-count');
    const isUpvoted = btn.classList.contains('upvoted');
    let currentCount = parseInt(countEl ? countEl.textContent.trim().replace(/,/g, '') : baseCount, 10) || baseCount;

    if (!isUpvoted) {
      btn.classList.add('upvoted');
      if (countEl) countEl.textContent = (currentCount + 1).toLocaleString();
      btn.style.transform = 'scale(1.1)';
      setTimeout(() => btn.style.transform = '', 200);
      showToastMessage('▲ Upvoted! Thank you for supporting African builders.');
    } else {
      btn.classList.remove('upvoted');
      if (countEl) countEl.textContent = Math.max(0, currentCount - 1).toLocaleString();
    }
  };

  // ========================================================================
  // Catalog (products.html) Filtering, Search, Sorting, and View Modes
  // ========================================================================
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const catalogGrid = document.getElementById('catalogGrid');
  const catalogCountText = document.getElementById('catalogCountText');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
  const catalogSortSelect = document.getElementById('catalogSortSelect');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const activeFilterChips = document.getElementById('activeFilterChips');

  if (catalogGrid) {
    const productItems = Array.from(catalogGrid.querySelectorAll('.product-item-col'));

    function filterCatalog() {
      const searchQuery = catalogSearchInput ? catalogSearchInput.value.toLowerCase().trim() : '';

      // Get active category filters
      const checkedCategories = Array.from(
        document.querySelectorAll('.filter-checkbox-label.checked[data-filter-type="category"]')
      ).map(el => el.getAttribute('data-value'));

      const isAllCategory = checkedCategories.includes('all') || checkedCategories.length === 0;

      // Get active country filters
      const checkedCountries = Array.from(
        document.querySelectorAll('.filter-checkbox-label.checked[data-filter-type="country"]')
      ).map(el => el.getAttribute('data-value'));

      // Get active pricing filters
      const checkedPricing = Array.from(
        document.querySelectorAll('.filter-checkbox-label.checked[data-filter-type="pricing"]')
      ).map(el => el.getAttribute('data-value'));

      let visibleCount = 0;

      productItems.forEach(item => {
        const itemCat = item.getAttribute('data-category') || '';
        const itemCountry = item.getAttribute('data-country') || '';
        const itemPricing = item.getAttribute('data-pricing') || '';
        const itemText = item.textContent.toLowerCase();

        const matchSearch = !searchQuery || itemText.includes(searchQuery);
        const matchCategory = isAllCategory || checkedCategories.includes(itemCat);
        const matchCountry = checkedCountries.length === 0 || checkedCountries.includes(itemCountry);
        const matchPricing = checkedPricing.length === 0 || checkedPricing.includes(itemPricing);

        if (matchSearch && matchCategory && matchCountry && matchPricing) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      if (catalogCountText) {
        catalogCountText.textContent = `Showing ${visibleCount} product${visibleCount === 1 ? '' : 's'}`;
      }
    }

    // Checkbox toggling
    document.querySelectorAll('.filter-checkbox-label').forEach(label => {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        const fType = label.getAttribute('data-filter-type');
        const val = label.getAttribute('data-value');

        if (fType === 'category') {
          if (val === 'all') {
            document.querySelectorAll('.filter-checkbox-label[data-filter-type="category"]').forEach(l => l.classList.remove('checked'));
            label.classList.add('checked');
          } else {
            const allLabel = document.querySelector('.filter-checkbox-label[data-filter-type="category"][data-value="all"]');
            if (allLabel) allLabel.classList.remove('checked');
            label.classList.toggle('checked');

            const anyChecked = document.querySelectorAll('.filter-checkbox-label.checked[data-filter-type="category"]').length > 0;
            if (!anyChecked && allLabel) {
              allLabel.classList.add('checked');
            }
          }
        } else {
          label.classList.toggle('checked');
        }

        filterCatalog();
      });
    });

    // Search bar typing
    if (catalogSearchInput) {
      catalogSearchInput.addEventListener('input', filterCatalog);
      
      // Shortcut key ⌘K / Ctrl+K
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          catalogSearchInput.focus();
          catalogSearchInput.select();
        }
      });
    }

    // Clear all filters
    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.addEventListener('click', () => {
        document.querySelectorAll('.filter-checkbox-label').forEach(l => l.classList.remove('checked'));
        const allLabel = document.querySelector('.filter-checkbox-label[data-filter-type="category"][data-value="all"]');
        if (allLabel) allLabel.classList.add('checked');
        if (catalogSearchInput) catalogSearchInput.value = '';
        if (activeFilterChips) activeFilterChips.innerHTML = '';
        filterCatalog();
        showToastMessage('Filters cleared.');
      });
    }

    // Active filter chips close
    if (activeFilterChips) {
      activeFilterChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip-pill');
        if (chip) {
          const tag = chip.getAttribute('data-tag');
          const targetCheckbox = document.querySelector(`.filter-checkbox-label[data-value="${tag}"]`);
          if (targetCheckbox) targetCheckbox.classList.remove('checked');
          chip.remove();
          filterCatalog();
        }
      });
    }

    // Sorting
    if (catalogSortSelect) {
      catalogSortSelect.addEventListener('change', () => {
        const sortVal = catalogSortSelect.value;
        const items = Array.from(catalogGrid.querySelectorAll('.product-item-col'));

        items.sort((a, b) => {
          if (sortVal === 'upvotes') {
            const upA = parseInt(a.getAttribute('data-upvotes') || '0', 10);
            const upB = parseInt(b.getAttribute('data-upvotes') || '0', 10);
            return upB - upA;
          } else if (sortVal === 'alpha') {
            const nameA = a.getAttribute('data-name') || '';
            const nameB = b.getAttribute('data-name') || '';
            return nameA.localeCompare(nameB);
          } else {
            return 0; // default order
          }
        });

        items.forEach(el => catalogGrid.appendChild(el));
      });
    }

    // Grid / List View Modes
    if (gridViewBtn && listViewBtn) {
      gridViewBtn.addEventListener('click', () => {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        productItems.forEach(item => {
          item.className = 'col-md-6 col-xl-4 product-item-col';
        });
      });

      listViewBtn.addEventListener('click', () => {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        productItems.forEach(item => {
          item.className = 'col-12 product-item-col';
        });
      });
    }

    // Read URL query parameters (e.g. ?category=fintech or ?country=nigeria)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const catParam = urlParams.get('category');
      const countryParam = urlParams.get('country');
      const qParam = urlParams.get('q');

      if (qParam) {
        const searchInput = document.getElementById('catalogSearchInput');
        if (searchInput) {
          searchInput.value = qParam;
        }
      }

      if (catParam) {
        const target = document.querySelector(`.filter-checkbox-label[data-filter-type="category"][data-value="${catParam}"]`);
        const allLabel = document.querySelector('.filter-checkbox-label[data-filter-type="category"][data-value="all"]');
        if (target) {
          if (allLabel) allLabel.classList.remove('checked');
          target.classList.add('checked');
        }
      }

      if (countryParam) {
        const target = document.querySelector(`.filter-checkbox-label[data-filter-type="country"][data-value="${countryParam}"]`);
        if (target) target.classList.add('checked');
      }

      filterCatalog();
    } catch (e) {}
  }

  // ========================================================================
  // Builder Stories (stories.html) Category Filter Pills
  // ========================================================================
  const storiesFilterNav = document.getElementById('storiesFilterNav');
  const storiesGrid = document.getElementById('storiesGrid');

  if (storiesFilterNav && storiesGrid) {
    const storyItems = storiesGrid.querySelectorAll('.story-grid-item');
    const filterButtons = storiesFilterNav.querySelectorAll('[data-story-filter]');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-story-filter');

        storyItems.forEach(item => {
          const itemCat = item.getAttribute('data-category');
          const itemType = item.getAttribute('data-type');

          if (filter === 'all') {
            item.style.display = '';
          } else if (filter === 'video') {
            item.style.display = itemType === 'video' ? '' : 'none';
          } else if (filter === 'podcast') {
            item.style.display = (itemType === 'podcast' || itemType === 'article') ? '' : 'none';
          } else {
            item.style.display = itemCat === filter ? '' : 'none';
          }
        });
      });
    });

    // Auto-activate filter if URL hash is #podcasts or #interviews
    const currentHash = window.location.hash;
    if (currentHash === '#podcasts') {
      const podcastBtn = storiesFilterNav.querySelector('[data-story-filter="podcast"]');
      if (podcastBtn) podcastBtn.click();
    } else if (currentHash === '#interviews') {
      const videoBtn = storiesFilterNav.querySelector('[data-story-filter="video"]');
      if (videoBtn) videoBtn.click();
    }
  }

  // ========================================================================
  // Hero Search Input & Navbar Search Navigation
  // ========================================================================
  const heroSearchInput = document.getElementById('heroSearchInput');
  const heroSearchBtn = document.getElementById('heroSearchBtn') || document.querySelector('.hero-search-wrapper button');
  if (heroSearchInput) {
    const performHeroSearch = (e) => {
      if (e) e.preventDefault();
      const val = heroSearchInput.value.trim();
      if (val) {
        window.location.href = `products.html?q=${encodeURIComponent(val)}`;
      } else {
        window.location.href = 'products.html';
      }
    };

    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performHeroSearch(e);
    });

    if (heroSearchBtn) {
      heroSearchBtn.addEventListener('click', performHeroSearch);
    }
  }

  // Navbar search button fallback for inner pages
  document.querySelectorAll('.navbar-action-btn[title*="Search"], button[title="Search products"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hero = document.getElementById('heroSearchInput');
      if (hero) {
        hero.focus();
      } else {
        window.location.href = 'products.html';
      }
    });
  });

  // ========================================================================
  // DYNAMIC DATA HYDRATION ENGINE (Connected to Backend SQLite API)
  // ========================================================================

  // 1. Upvote Delegation (Supports dynamically rendered cards & static cards)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.upvote-badge-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const countEl = btn.querySelector('.upvote-count');
    const prodItem = btn.closest('[data-product-id]') || btn.closest('.trending-card-item') || btn.closest('.launch-leaderboard-row');
    const productId = btn.getAttribute('data-vote-id') || prodItem?.getAttribute('data-product-id');

    if (productId && window.DiscovaAPI) {
      btn.style.transform = 'scale(1.15)';
      setTimeout(() => btn.style.transform = '', 180);

      const res = await window.DiscovaAPI.voteProduct(productId);
      if (res && res.success) {
        if (countEl) countEl.textContent = res.votesCount;
        if (res.voted) {
          btn.classList.add('upvoted');
          window.showToastMessage('▲ Upvoted! Thank you for supporting African builders.');
        } else {
          btn.classList.remove('upvoted');
          window.showToastMessage('Upvote removed.');
        }
        return;
      }
    }

    // Fallback if no productId / offline
    if (countEl) {
      let currentCount = parseInt(countEl.textContent.trim().replace(/,/g, ''), 10) || 0;
      const isUpvoted = btn.classList.contains('upvoted');
      if (!isUpvoted) {
        btn.classList.add('upvoted');
        countEl.textContent = (currentCount + 1).toLocaleString();
        window.showToastMessage('▲ Upvoted! Thank you for supporting African builders.');
      } else {
        btn.classList.remove('upvoted');
        countEl.textContent = Math.max(0, currentCount - 1).toLocaleString();
      }
    }
  });

  // 2. Newsletter Forms Connected to Backend API
  document.querySelectorAll('.newsletter-form, .cta-newsletter-wrapper form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value) {
        const email = input.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const origText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Subscribing...';
        }

        if (window.DiscovaAPI) {
          const res = await window.DiscovaAPI.subscribeNewsletter(email);
          if (res && res.success) {
            window.showToastMessage(res.message);
            input.value = '';
          } else {
            window.showToastMessage(res?.error || 'Subscription failed. Please check your email.');
          }
        } else {
          window.showToastMessage(`🎉 Subscribed ${email} to Discova weekly updates!`);
          input.value = '';
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });
  });

  // 3. Hydrate Index Page (Trending Grid, Category Pills, Timeframes & Hero Search)
  async function hydrateIndexPage() {
    const trendingGrid = document.getElementById('trendingGrid');
    if (!trendingGrid) return;

    let currentIndexCategory = 'all';
    let currentTimeframe = 'today';
    let currentSearch = '';

    // Check URL parameters (e.g. index.html?category=fintech)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
      currentIndexCategory = urlParams.get('category');
    }
    if (urlParams.get('q')) {
      currentSearch = urlParams.get('q');
      const searchInput = document.getElementById('heroSearchInput');
      if (searchInput) searchInput.value = currentSearch;
    }

    const pillsContainer = document.querySelector('.category-pills-list');

    // Sync active category pill in DOM
    function updateActivePill(category) {
      if (!pillsContainer) return;
      const pills = pillsContainer.querySelectorAll('.cat-pill');
      pills.forEach(pill => {
        const cat = pill.getAttribute('data-category');
        if (cat === category || (category === 'health' && cat === 'healthtech') || (category === 'healthtech' && cat === 'health')) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    // Set initial active pill
    updateActivePill(currentIndexCategory);

    // Fallback local filtering if API is unreachable
    function filterTrendingCardsLocally(cat, search) {
      trendingGrid.style.opacity = '1';
      const cards = trendingGrid.querySelectorAll('.trending-card-item');
      let visible = 0;
      cards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        const cardText = card.textContent.toLowerCase();
        const matchesCat = (cat === 'all' || cardCat === cat || (cat === 'health' && cardCat === 'healthtech') || (cat === 'healthtech' && cardCat === 'health'));
        const matchesSearch = !search || cardText.includes(search.toLowerCase());

        if (matchesCat && matchesSearch) {
          card.style.display = 'block';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      const existingEmpty = trendingGrid.querySelector('.local-empty-state');
      if (visible === 0) {
        if (!existingEmpty) {
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'col-12 text-center py-5 local-empty-state';
          emptyDiv.innerHTML = `
            <div class="fs-1 mb-2">🚀</div>
            <h3 class="h5 fw-bold mb-1">No products found</h3>
            <p class="text-muted small mb-3">Be the first African innovator to showcase a product here!</p>
            <a href="submit.html" class="btn btn-sm btn-primary rounded-pill px-4">Submit your product →</a>
          `;
          trendingGrid.appendChild(emptyDiv);
        }
      } else if (existingEmpty) {
        existingEmpty.remove();
      }
    }

    // Function to load and render products into trendingGrid
    async function loadIndexProducts() {
      // Subtle loading fade
      trendingGrid.style.opacity = '0.5';

      try {
        let sortParam = 'trending';
        if (currentTimeframe === 'week') sortParam = 'trending';
        if (currentTimeframe === 'all') sortParam = 'votes';

        const params = { sort: sortParam };
        if (currentIndexCategory && currentIndexCategory !== 'all') {
          params.category = currentIndexCategory === 'health' ? 'healthtech' : currentIndexCategory;
        }
        if (currentSearch) {
          params.search = currentSearch;
        }

        if (window.DiscovaAPI && window.DiscovaRenderers) {
          const res = await window.DiscovaAPI.getProducts(params);
          trendingGrid.style.opacity = '1';

          if (res && res.success) {
            if (res.data.length === 0) {
              const activeCatPill = pillsContainer?.querySelector('.cat-pill.active');
              const catName = activeCatPill ? activeCatPill.textContent.trim() : 'this category';
              trendingGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                  <div class="fs-1 mb-2">🚀</div>
                  <h3 class="h5 fw-bold mb-1">No products found in ${catName}</h3>
                  <p class="text-muted small mb-3">Be the first African innovator to showcase a product here!</p>
                  <a href="submit.html" class="btn btn-sm btn-primary rounded-pill px-4">Submit your product →</a>
                </div>
              `;
            } else {
              trendingGrid.innerHTML = res.data.map(p => window.DiscovaRenderers.productCard(p)).join('');
            }
          } else {
            filterTrendingCardsLocally(currentIndexCategory, currentSearch);
          }
        } else {
          filterTrendingCardsLocally(currentIndexCategory, currentSearch);
        }
      } catch (err) {
        trendingGrid.style.opacity = '1';
        console.warn('Index load products error:', err);
        filterTrendingCardsLocally(currentIndexCategory, currentSearch);
      }
    }

    // Dynamic Category Count from API
    try {
      if (window.DiscovaAPI && typeof window.DiscovaAPI.getCategories === 'function') {
        window.DiscovaAPI.getCategories().then(catRes => {
          if (catRes && catRes.success && catRes.data) {
            const countEl = document.querySelector('.cat-label-box .label-count');
            if (countEl) {
              countEl.innerHTML = `${catRes.data.length} categories <span style="font-size: 0.9em; margin-left: 2px;">↗</span>`;
            }
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Category count sync error:', e);
    }

    // Category Pills Click Event Delegation
    if (pillsContainer) {
      pillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.cat-pill');
        if (!pill) return;

        currentIndexCategory = pill.getAttribute('data-category') || 'all';
        updateActivePill(currentIndexCategory);
        loadIndexProducts();
      });
    }

    // Timeframe Tabs Handling
    const timeframeTabs = document.querySelectorAll('.timeframe-tab');
    timeframeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        timeframeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTimeframe = tab.getAttribute('data-timeframe') || 'today';
        loadIndexProducts();
      });
    });

    // Hero Search Handling
    const heroSearchInput = document.getElementById('heroSearchInput');
    const heroSearchBtn = document.getElementById('heroSearchBtn');

    function performHeroSearch() {
      if (!heroSearchInput) return;
      currentSearch = heroSearchInput.value.trim();
      const trendingSec = document.getElementById('trending');
      if (trendingSec) {
        trendingSec.scrollIntoView({ behavior: 'smooth' });
      }
      loadIndexProducts();
    }

    if (heroSearchInput) {
      heroSearchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performHeroSearch();
      });
    }
    if (heroSearchBtn) {
      heroSearchBtn.addEventListener('click', performHeroSearch);
    }

    // Initial Load
    await loadIndexProducts();
  }

  // 4. Hydrate Products Directory (products.html)
  async function hydrateProductsPage() {
    const productsGrid = document.getElementById('catalogGrid') || document.getElementById('productsGrid');
    if (!productsGrid || !window.DiscovaAPI || !window.DiscovaRenderers) return;

    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'all';
    let currentSelectedCountry = urlParams.get('country') || '';
    const initialSearch = urlParams.get('q') || '';
    const initialSort = urlParams.get('sort') || 'trending';

    const searchInput = document.getElementById('catalogSearchInput') || document.getElementById('productSearchInput') || document.getElementById('heroSearchInput');
    if (searchInput && initialSearch) {
      searchInput.value = initialSearch;
    }

    if (initialCategory !== 'all') {
      document.querySelectorAll('.cat-pill, .filter-checkbox-label[data-filter-type="category"]').forEach(pill => {
        if (pill.getAttribute('data-category') === initialCategory || pill.getAttribute('data-value') === initialCategory) {
          pill.classList.add('active');
          pill.classList.add('checked');
        } else {
          pill.classList.remove('active');
          pill.classList.remove('checked');
        }
      });
    }

    async function loadProducts(cat, search, sort, country = currentSelectedCountry) {
      currentSelectedCountry = country;
      productsGrid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="text-muted mt-2">Loading African tech products...</p></div>';

      try {
        const queryParams = { category: cat, search: search, sort: sort };
        if (country) queryParams.country = country;

        const res = await window.DiscovaAPI.getProducts(queryParams);
        if (res && res.success) {
          if (res.data.length === 0) {
            productsGrid.innerHTML = `
              <div class="col-12 text-center py-5">
                <div class="fs-1 mb-3">🔍</div>
                <h3 class="h4 fw-bold text-white mb-2">No products found</h3>
                <p class="text-muted mb-4">No African solutions currently match this filter. Be the first to submit!</p>
                <a href="submit.html" class="btn-pill-white text-decoration-none">Submit a product →</a>
              </div>
            `;
          } else {
            productsGrid.innerHTML = res.data.map(p => window.DiscovaRenderers.productCard(p)).join('');
          }
          const countBadge = document.getElementById('catalogCountText') || document.getElementById('productsCountBadge') || document.querySelector('.products-count-badge');
          if (countBadge) countBadge.textContent = `Showing ${res.data.length} products`;
        }
      } catch (e) {
        console.warn('Error loading products:', e);
      }
    }

    window.handleCatalogCountryFilter = function(cVal) {
      const activePill = document.querySelector('.cat-pill.active, .filter-checkbox-label[data-filter-type="category"].checked');
      const selectedCat = activePill ? (activePill.getAttribute('data-category') || activePill.getAttribute('data-value')) : 'all';
      const currentSearch = searchInput ? searchInput.value.trim() : '';
      const sortSelect = document.getElementById('catalogSortSelect') || document.getElementById('productsSortSelect');
      const currentSort = sortSelect ? sortSelect.value : 'trending';
      loadProducts(selectedCat, currentSearch, currentSort, cVal);
    };

    loadProducts(initialCategory, initialSearch, initialSort, currentSelectedCountry);

    // Sidebar and pill category filter triggers
    document.querySelectorAll('.cat-pill, .filter-checkbox-label[data-filter-type="category"]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.cat-pill, .filter-checkbox-label[data-filter-type="category"]').forEach(p => {
          p.classList.remove('active');
          p.classList.remove('checked');
        });
        pill.classList.add('active');
        pill.classList.add('checked');

        const selectedCat = pill.getAttribute('data-category') || pill.getAttribute('data-value');
        const currentSearch = searchInput ? searchInput.value.trim() : '';
        const sortSelect = document.getElementById('catalogSortSelect') || document.getElementById('productsSortSelect');
        const currentSort = sortSelect ? sortSelect.value : 'trending';
        loadProducts(selectedCat, currentSearch, currentSort, currentSelectedCountry);
      });
    });

    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          const activePill = document.querySelector('.cat-pill.active, .filter-checkbox-label[data-filter-type="category"].checked');
          const selectedCat = activePill ? (activePill.getAttribute('data-category') || activePill.getAttribute('data-value')) : 'all';
          const sortSelect = document.getElementById('catalogSortSelect') || document.getElementById('productsSortSelect');
          const currentSort = sortSelect ? sortSelect.value : 'trending';
          loadProducts(selectedCat, searchInput.value.trim(), currentSort, currentSelectedCountry);
        }, 300);
      });
    }

    const sortSelect = document.getElementById('catalogSortSelect') || document.getElementById('productsSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        const activePill = document.querySelector('.cat-pill.active, .filter-checkbox-label[data-filter-type="category"].checked');
        const selectedCat = activePill ? (activePill.getAttribute('data-category') || activePill.getAttribute('data-value')) : 'all';
        const currentSearch = searchInput ? searchInput.value.trim() : '';
        loadProducts(selectedCat, currentSearch, sortSelect.value, currentSelectedCountry);
      });
    }
  }

  // 5. Hydrate Product Details (product-details.html)
  async function hydrateProductDetailsPage() {
    const detailsHero = document.querySelector('.product-hero') || document.getElementById('productHeroArea');
    if (!detailsHero || !window.DiscovaAPI) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('id') || 'pxxl';

    try {
      const res = await window.DiscovaAPI.getProduct(slug);
      if (res && res.success && res.data) {
        const p = res.data;

        document.title = `${p.name} — Discova Africa Tech`;

        const titleEl = document.getElementById('productDetailTitle') || document.querySelector('.product-hero-title');
        if (titleEl) titleEl.textContent = p.name;

        const taglineEl = document.getElementById('productDetailTagline') || document.querySelector('.product-hero-tagline');
        if (taglineEl) taglineEl.textContent = p.tagline;

        const descEl = document.getElementById('productDetailDesc') || document.querySelector('.product-about-text');
        if (descEl) descEl.textContent = p.description;

        const voteCountEl = document.getElementById('productDetailVotes') || document.querySelector('.detail-upvote-btn .upvote-count');
        if (voteCountEl) voteCountEl.textContent = p.votes_count;

        const voteBtn = document.querySelector('.detail-upvote-btn');
        if (voteBtn) voteBtn.setAttribute('data-vote-id', p.id);

        const locationEl = document.getElementById('productDetailLocation');
        if (locationEl) locationEl.textContent = [p.city, p.country].filter(Boolean).join(', ');

        const pricingEl = document.getElementById('productDetailPricing');
        if (pricingEl) pricingEl.textContent = p.pricing_type || 'Free';

        const websiteLink = document.getElementById('productDetailWebsiteLink');
        if (websiteLink && p.website_url) websiteLink.href = p.website_url;

        const githubLink = document.getElementById('productDetailGithubLink');
        if (githubLink && p.github_url) githubLink.href = p.github_url;

        const makerNameEl = document.getElementById('productMakerName');
        if (makerNameEl && p.maker_name) makerNameEl.textContent = p.maker_name;

        const makerRoleEl = document.getElementById('productMakerRole');
        if (makerRoleEl && p.maker_role) makerRoleEl.textContent = p.maker_role;

        const reviewsContainer = document.getElementById('productReviewsList');
        if (reviewsContainer && p.reviews) {
          if (p.reviews.length === 0) {
            reviewsContainer.innerHTML = '<div class="text-muted small py-3">No reviews yet. Be the first to leave feedback for the maker!</div>';
          } else {
            reviewsContainer.innerHTML = p.reviews.map(r => `
              <div class="review-item mb-3 pb-3 border-bottom border-secondary border-opacity-15">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px; font-size: 0.8rem;">
                      ${r.author_name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div class="fw-bold text-white small">${r.author_name}</div>
                      <div class="text-muted" style="font-size: 0.7rem;">${r.author_role || 'Builder'}</div>
                    </div>
                  </div>
                  <div class="text-warning small">${'★'.repeat(r.rating || 5)}</div>
                </div>
                <p class="text-muted small mb-0" style="line-height: 1.6;">${r.content}</p>
              </div>
            `).join('');
          }
        }
      }
    } catch (e) {
      console.warn('Product details hydration error:', e);
    }
  }

  // 6. Hydrate Launches Page (launches.html)
  async function hydrateLaunchesPage() {
    const todayList = document.getElementById('todayLaunchesList');
    const yesterdayList = document.getElementById('yesterdayLaunchesList');
    if ((!todayList && !yesterdayList) || !window.DiscovaAPI || !window.DiscovaRenderers) return;

    try {
      const res = await window.DiscovaAPI.getLaunches();
      if (res && res.success && res.data) {
        if (todayList && res.data.today) {
          if (res.data.today.length === 0) {
            todayList.innerHTML = '<div class="text-muted py-4 text-center">No launches recorded yet today. <a href="submit.html" class="text-primary fw-bold">Launch your product →</a></div>';
          } else {
            todayList.innerHTML = res.data.today.map((item, idx) => window.DiscovaRenderers.leaderboardRow(item, idx)).join('');
          }
        }

        if (yesterdayList && res.data.yesterday) {
          if (res.data.yesterday.length === 0) {
            yesterdayList.innerHTML = '<div class="text-muted py-4 text-center">No launches recorded yesterday.</div>';
          } else {
            yesterdayList.innerHTML = res.data.yesterday.map((item, idx) => window.DiscovaRenderers.leaderboardRow(item, idx)).join('');
          }
        }
      }
    } catch (e) {
      console.warn('Launches hydration error:', e);
    }
  }

  // 7. Hydrate Stories Hub (stories.html)
  async function hydrateStoriesPage() {
    const storiesGrid = document.getElementById('storiesGrid');
    if (!storiesGrid || !window.DiscovaAPI || !window.DiscovaRenderers) return;

    try {
      const res = await window.DiscovaAPI.getStories();
      if (res && res.success && res.data && res.data.length > 0) {
        storiesGrid.innerHTML = res.data.map(s => window.DiscovaRenderers.storyCard(s)).join('');
      }
    } catch (e) {
      console.warn('Stories hydration error:', e);
    }
  }

  // 8. Hydrate Story Details (story-details.html)
  async function hydrateStoryDetailsPage() {
    const fullTranscript = document.getElementById('fullTranscript');
    if (!fullTranscript || !window.DiscovaAPI) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('id') || 'akinkunmi';

    try {
      const res = await window.DiscovaAPI.getStory(slug);
      if (res && res.success && res.data) {
        const s = res.data;

        if (s.transcript && s.transcript.length > 0) {
          const turnsHtml = s.transcript.map(turn => `
            <div class="dialogue-turn-row">
              <span class="chapter-stamp me-2">${turn.time}</span>
              <span class="dialogue-speaker">${turn.speaker}</span>
              <span class="dialogue-text">${turn.text}</span>
            </div>
          `).join('');

          fullTranscript.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary border-opacity-25">
              <span class="fw-bold text-white small">From the interview (${s.founder_name})</span>
              <span class="text-muted small">${s.transcript.length} verified chapters</span>
            </div>
            ${turnsHtml}
          `;
        }
      }
    } catch (e) {
      console.warn('Story details hydration error:', e);
    }
  }

  // 9. Hydrate Categories Page (categories.html)
  async function hydrateCategoriesPage() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid || !window.DiscovaAPI || !window.DiscovaRenderers) return;

    try {
      const res = await window.DiscovaAPI.getCategories();
      if (res && res.success && res.data && res.data.length > 0) {
        categoriesGrid.innerHTML = res.data.map(c => window.DiscovaRenderers.categoryCard(c)).join('');
      }
    } catch (e) {
      console.warn('Categories hydration error:', e);
    }
  }

  // 10. Hydrate Product Submission Form (submit.html)
  function hydrateSubmitPage() {
    const submitForm = document.getElementById('productSubmissionWizardForm') || document.querySelector('form.wizard-form') || document.querySelector('form#submitWizardForm');
    if (!submitForm || !window.DiscovaAPI) return;

    submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('prodNameInput') || submitForm.querySelector('[name="name"]') || submitForm.querySelector('input[placeholder*="Product name"]');
      const taglineInput = document.getElementById('prodTaglineInput') || submitForm.querySelector('[name="tagline"]') || submitForm.querySelector('input[placeholder*="tagline"]');
      const descInput = document.getElementById('prodDescInput') || submitForm.querySelector('[name="description"]');
      const catSelect = document.getElementById('prodCategorySelect') || submitForm.querySelector('select');
      const webInput = document.getElementById('prodWebsiteInput') || submitForm.querySelector('input[type="url"]');
      const makerNameInput = document.getElementById('makerNameInput') || submitForm.querySelector('input[placeholder*="Full name"]');
      const makerEmailInput = document.getElementById('makerEmailInput') || submitForm.querySelector('input[type="email"]');

      if (!nameInput?.value || !taglineInput?.value || !makerEmailInput?.value) {
        window.showToastMessage('Please fill in required fields: Product name, Tagline, and Maker email.');
        return;
      }

      const submitBtn = submitForm.querySelector('button[type="submit"]') || submitForm.querySelector('.btn-pill-white');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting product...';
      }

      const payload = {
        productName: nameInput.value.trim(),
        tagline: taglineInput.value.trim(),
        description: descInput?.value.trim() || taglineInput.value.trim(),
        category: catSelect?.value || 'devtools',
        websiteUrl: webInput?.value.trim() || '',
        makerName: makerNameInput?.value.trim() || 'African Maker',
        makerEmail: makerEmailInput.value.trim()
      };

      const res = await window.DiscovaAPI.submitProduct(payload);

      if (res && res.success) {
        window.location.href = `submit-success.html?id=${res.submissionId}&name=${encodeURIComponent(payload.productName)}`;
      } else {
        window.showToastMessage(res?.error || 'Submission failed. Please try again.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Product';
        }
      }
    });
  }

  // 11. Hydrate Submit Success Page (submit-success.html)
  function hydrateSubmitSuccessPage() {
    const refEl = document.getElementById('successRefCode');
    const headingEl = document.getElementById('successHeading');
    if (!refEl && !headingEl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const subId = urlParams.get('id');
    const prodName = urlParams.get('name');

    if (subId && refEl) {
      refEl.textContent = `DSC-2026-${String(subId).padStart(4, '0')}`;
    }
    if (prodName && headingEl) {
      headingEl.innerHTML = `${decodeURIComponent(prodName)} is <span class="font-serif-italic">in review.</span>`;
    }
  }

  // 12. Dynamic Platform Statistics & Country Representation
  async function hydratePlatformStats() {
    if (!window.DiscovaAPI || typeof window.DiscovaAPI.getStats !== 'function') return;

    try {
      const res = await window.DiscovaAPI.getStats();
      if (!res || !res.success || !res.stats) return;
      const s = res.stats;

      // 1. Homepage "BY THE NUMBERS" Bento Card (index.html)
      const statProd = document.getElementById('statProductsCount');
      const statCountry = document.getElementById('statCountriesCount');
      const statStartup = document.getElementById('statStartupsCount');
      if (statProd) statProd.textContent = s.totalProducts;
      if (statCountry) statCountry.textContent = s.totalCountries;
      if (statStartup) statStartup.textContent = s.totalStories;

      // Homepage Bottom Explore CTA (index.html)
      const exploreBtnText = document.getElementById('exploreProductsCountText');
      if (exploreBtnText) {
        exploreBtnText.textContent = `Explore all ${s.totalProducts} products`;
      }

      // 2. Products Catalog Header & Search (products.html)
      const catalogBadge = document.getElementById('catalogHeroBadgeText');
      if (catalogBadge) {
        catalogBadge.textContent = `DISCOVA DIRECTORY • ${s.totalProducts} VERIFIED PRODUCTS`;
      }
      const catalogDesc = document.getElementById('catalogHeroDesc');
      if (catalogDesc) {
        catalogDesc.textContent = `Discover, upvote, and explore the fastest-growing software, AI models, and financial infrastructure built across ${s.totalCountries} countries.`;
      }
      const catalogInput = document.getElementById('catalogSearchInput');
      if (catalogInput) {
        catalogInput.placeholder = `Search ${s.totalProducts} products by name, tag, or country...`;
      }

      // Sidebar Country Filter List (products.html)
      const sidebarCountryList = document.getElementById('sidebarCountryList');
      if (sidebarCountryList && s.countries && s.countries.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const activeCountry = (urlParams.get('country') || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        sidebarCountryList.innerHTML = s.countries.map(c => {
          const valSlug = c.country.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isChecked = activeCountry && activeCountry === valSlug;
          return `
            <label class="filter-checkbox-label ${isChecked ? 'checked' : ''}" data-filter-type="country" data-value="${valSlug}">
              <div class="filter-checkbox-left">
                <span class="custom-checkbox"></span>
                <span>${c.country} ${c.flag || ''}</span>
              </div>
              <span class="filter-count-badge">${c.count}</span>
            </label>
          `;
        }).join('');

        // Attach click listeners to dynamic country filters
        sidebarCountryList.querySelectorAll('.filter-checkbox-label').forEach(label => {
          label.addEventListener('click', () => {
            const isCurrentlyChecked = label.classList.contains('checked');
            sidebarCountryList.querySelectorAll('.filter-checkbox-label').forEach(l => l.classList.remove('checked'));
            if (!isCurrentlyChecked) {
              label.classList.add('checked');
              const val = label.getAttribute('data-value');
              if (window.handleCatalogCountryFilter) window.handleCatalogCountryFilter(val);
            } else {
              if (window.handleCatalogCountryFilter) window.handleCatalogCountryFilter('');
            }
          });
        });
      }

      // 3. About Us Stats Ribbon (about.html)
      const aboutProd = document.getElementById('aboutStatProducts');
      const aboutCountry = document.getElementById('aboutStatCountries');
      const aboutStories = document.getElementById('aboutStatStories');
      if (aboutProd) aboutProd.textContent = s.totalProducts;
      if (aboutCountry) aboutCountry.textContent = s.totalCountries;
      if (aboutStories) aboutStories.textContent = s.totalStories;

      // 4. Founder Stories Header (stories.html)
      const storiesBadge = document.getElementById('storiesBadgeText');
      if (storiesBadge) {
        storiesBadge.textContent = `DISCOVA ORIGINALS • ${s.totalStories} FOUNDER STORIES`;
      }

      // 5. Geographic Ecosystem Section (categories.html)
      const catCountryWrap = document.getElementById('categoriesCountryPillsWrap');
      if (catCountryWrap && s.countries && s.countries.length > 0) {
        catCountryWrap.innerHTML = s.countries.map(c => {
          const valSlug = c.country.toLowerCase().replace(/[^a-z0-9]/g, '');
          return `
            <a href="products.html?country=${valSlug}" class="country-pill-item text-decoration-none">
              <span>${c.flag || '🌍'} ${c.country}</span>
              <span class="country-badge-num">${c.count}</span>
            </a>
          `;
        }).join('');
      }

    } catch (err) {
      console.warn('Error hydrating platform stats:', err);
    }
  }

  // Run Hydrations automatically
  hydratePlatformStats();
  hydrateIndexPage();
  hydrateProductsPage();
  hydrateProductDetailsPage();
  hydrateLaunchesPage();
  hydrateStoriesPage();
  hydrateStoryDetailsPage();
  hydrateCategoriesPage();
  hydrateSubmitPage();
  hydrateSubmitSuccessPage();

