/**
 * DISCOVA AFRICA TECH — Frontend API Client
 * Provides dynamic data fetching, atomic voting, product submissions,
 * reviews, and newsletter subscriptions with graceful fallbacks.
 */

(function (window) {
  'use strict';

  // Base API configuration (relative path works universally in development and production)
  const API_BASE = '/api';


  // Persistent Voter Token for Unique Upvoting
  function getVoterToken() {
    let token = localStorage.getItem('discova_voter_token');
    if (!token) {
      token = 'voter_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem('discova_voter_token', token);
    }
    return token;
  }

  // Generic Fetch Helper with Timeout & Fallbacks
  async function apiRequest(endpoint, options = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const token = localStorage.getItem('discova_token');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      return json;
    } catch (err) {
      console.warn(`[DiscovaAPI] Request to ${endpoint} failed:`, err.message);
      return { success: false, error: err.message, networkError: true };
    }
  }

  const DiscovaAPI = {
    // Products
    async getProducts(params = {}) {
      const q = new URLSearchParams();
      if (params.category && params.category !== 'all') q.set('category', params.category);
      if (params.country && params.country !== 'all') q.set('country', params.country);
      if (params.search) q.set('search', params.search);
      if (params.sort) q.set('sort', params.sort);
      if (params.featured) q.set('featured', params.featured);

      const queryString = q.toString() ? `?${q.toString()}` : '';
      return await apiRequest(`/products${queryString}`);
    },

    async getProduct(slug) {
      return await apiRequest(`/products/${slug}`);
    },

    async voteProduct(productId) {
      return await apiRequest(`/products/${productId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ voterToken: getVoterToken() })
      });
    },

    async submitReview(productId, reviewData) {
      return await apiRequest(`/products/${productId}/review`, {
        method: 'POST',
        body: JSON.stringify(reviewData)
      });
    },

    // Categories
    async getCategories() {
      return await apiRequest('/categories');
    },

    // Public Platform Statistics & Country Breakdown
    async getStats() {
      return await apiRequest('/stats');
    },

    // Launches & Leaderboard
    async getLaunches() {
      return await apiRequest('/launches');
    },

    // Founder Stories & Interviews
    async getStories(params = {}) {
      const q = new URLSearchParams();
      if (params.type && params.type !== 'all') q.set('type', params.type);
      if (params.category && params.category !== 'all') q.set('category', params.category);

      const queryString = q.toString() ? `?${q.toString()}` : '';
      return await apiRequest(`/stories${queryString}`);
    },

    async getStory(slug) {
      return await apiRequest(`/stories/${slug}`);
    },

    async createStory(storyData) {
      return await apiRequest('/stories', {
        method: 'POST',
        body: JSON.stringify(storyData)
      });
    },

    // Submissions
    async submitProduct(formData) {
      return await apiRequest('/submissions', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
    },

    // Newsletter
    async subscribeNewsletter(email, sourcePage = 'footer') {
      return await apiRequest('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email, sourcePage })
      });
    },

    // Authentication (Registration & Login)
    async register(userData) {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (res && res.success && res.user) {
        this.setCurrentUser(res.user);
      }
      return res;
    },

    async login(credentials) {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res && res.success && res.user) {
        this.setCurrentUser(res.user);
      }
      return res;
    },

    getCurrentUser() {
      try {
        const stored = localStorage.getItem('discova_user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    },

    setCurrentUser(user) {
      try {
        if (user) {
          localStorage.setItem('discova_user', JSON.stringify(user));
          if (user.token) {
            localStorage.setItem('discova_token', user.token);
          }
        } else {
          localStorage.removeItem('discova_user');
          localStorage.removeItem('discova_token');
        }
      } catch (e) {}
    },

    async logout() {
      this.setCurrentUser(null);
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (e) {}
      window.location.reload();
    },

    // Password Reset & Verification
    async forgotPassword(email) {
      return await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async verifyResetToken(token) {
      return await apiRequest(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    },

    async resetPassword(token, newPassword) {
      return await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
    },

    async verifyEmail(token) {
      return await apiRequest(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    },

    async resendVerification(email) {
      return await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    // Admin Suite API
    admin: {
      async getStats() {
        return await apiRequest('/admin/stats');
      },

      async getUsers(params = {}) {
        const q = new URLSearchParams();
        if (params.search) q.set('search', params.search);
        if (params.filter) q.set('filter', params.filter);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return await apiRequest(`/admin/users${qs}`);
      },

      async toggleUserVerify(userId) {
        return await apiRequest(`/admin/users/${userId}/toggle-verify`, {
          method: 'POST'
        });
      },

      async generateResetLink(userId) {
        return await apiRequest(`/admin/users/${userId}/generate-reset`, {
          method: 'POST'
        });
      },

      async deleteUser(userId) {
        return await apiRequest(`/admin/users/${userId}`, {
          method: 'DELETE'
        });
      },

      async getSettings() {
        return await apiRequest('/admin/settings');
      },

      async updateSettings(settings) {
        return await apiRequest('/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(settings)
        });
      },

      async testSmtp(config = {}) {
        return await apiRequest('/admin/smtp/test', {
          method: 'POST',
          body: JSON.stringify(config)
        });
      },

      async getEmails(params = {}) {
        const q = new URLSearchParams();
        if (params.status) q.set('status', params.status);
        if (params.limit) q.set('limit', params.limit);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return await apiRequest(`/admin/emails${qs}`);
      },

      // Products Management
      async getProducts(params = {}) {
        const q = new URLSearchParams();
        if (params.search) q.set('search', params.search);
        if (params.category && params.category !== 'all') q.set('category', params.category);
        if (params.sort) q.set('sort', params.sort);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return await apiRequest(`/admin/products${qs}`);
      },

      async getProduct(id) {
        return await apiRequest(`/admin/products/${id}`);
      },

      async createProduct(data) {
        return await apiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },

      async updateProduct(id, data) {
        return await apiRequest(`/admin/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      },

      async deleteProduct(id) {
        return await apiRequest(`/admin/products/${id}`, {
          method: 'DELETE'
        });
      },

      async toggleFeaturedProduct(id) {
        return await apiRequest(`/admin/products/${id}/toggle-featured`, {
          method: 'POST'
        });
      },

      async toggleTrendingProduct(id) {
        return await apiRequest(`/admin/products/${id}/toggle-trending`, {
          method: 'POST'
        });
      },

      async clearDemoProducts() {
        return await apiRequest('/admin/products/clear-demo', {
          method: 'POST'
        });
      },

      // Submissions Management
      async getSubmissions(params = {}) {
        const q = new URLSearchParams();
        if (params.status && params.status !== 'all') q.set('status', params.status);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return await apiRequest(`/admin/submissions${qs}`);
      },

      async approveSubmission(id) {
        return await apiRequest(`/admin/submissions/${id}/approve`, {
          method: 'POST'
        });
      },

      async rejectSubmission(id) {
        return await apiRequest(`/admin/submissions/${id}/reject`, {
          method: 'POST'
        });
      },

      async deleteSubmission(id) {
        return await apiRequest(`/admin/submissions/${id}`, {
          method: 'DELETE'
        });
      }
    }
  };

  // Reusable Component Renderers for Dynamic UI Generation
  const DiscovaRenderers = {
    // 1. Grid Product Card (Used on index.html and products.html)
    productCard(p) {
      const bannerClass = p.banner_class || 'banner-default';
      const cityCountry = [p.city, p.country].filter(Boolean).join(', ') || 'Africa';
      const catColor = p.category_color || '#3B82F6';
      const catIcon = p.category_icon || '🚀';
      const catName = p.category_name || 'Technology';

      return `
        <div class="col-md-6 col-lg-3 trending-card-item" data-category="${p.category_id || 'devtools'}" data-base-votes="${p.votes_count || 0}" data-product-id="${p.id}">
          <div class="product-card h-100 d-flex flex-column">
            <!-- Banner Header -->
            <div class="product-card-banner ${bannerClass}">
              <div class="top-badges">
                ${p.is_featured ? '<span class="badge bg-black bg-opacity-25 text-white rounded-pill px-2 py-1" style="font-size: 0.65rem;">Featured</span>' : '<span></span>'}
                <button type="button" class="upvote-badge-btn" data-vote-id="${p.id}" title="Upvote ${p.name}">
                  <span>▲</span>
                  <span class="upvote-count">${p.votes_count || 0}</span>
                </button>
              </div>
              <div class="card-product-name">${p.name}</div>
            </div>

            <!-- Card Body -->
            <div class="product-card-body d-flex flex-column justify-content-between flex-grow-1">
              <div>
                <div class="category-tag-row mb-2">
                  <div class="cat-mini-icon" style="background: ${catColor};">${catIcon}</div>
                  <span class="cat-mini-name">${catName}</span>
                </div>
                <p class="product-desc mb-3">
                  ${p.tagline || p.description}
                </p>
              </div>

              <!-- Footer -->
              <div class="product-card-footer mt-auto pt-2 border-top border-secondary border-opacity-10 d-flex align-items-center justify-content-between">
                <span>${cityCountry}</span>
                <a href="product-details.html?id=${p.slug}" class="visit-link">Visit product ↗</a>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 2. Leaderboard Row (Used on launches.html)
    leaderboardRow(item, index) {
      const rank = index + 1;
      const rankBadgeClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
      const bannerClass = item.banner_class || 'banner-default';
      const catColor = item.category_color || '#3B82F6';
      const catName = item.category_name || 'Tech';
      const pricing = item.pricing_type || 'Free';

      return `
        <div class="launch-leaderboard-row" data-product-id="${item.product_id}">
          <div class="d-flex align-items-center gap-3">
            <span class="launch-rank-badge ${rankBadgeClass}">#${rank}</span>
            <div class="launch-card-banner-mini ${bannerClass}">
              <span>${item.name.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <div class="d-flex align-items-center gap-2">
                <a href="product-details.html?id=${item.slug}" class="launch-product-title text-decoration-none">${item.name}</a>
                <span class="badge rounded-pill px-2 py-0.5" style="background: ${catColor}20; color: ${catColor}; font-size: 0.65rem;">${catName}</span>
                <span class="text-muted small d-none d-md-inline">• ${pricing}</span>
              </div>
              <div class="launch-product-tagline text-muted small">${item.tagline}</div>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button type="button" class="upvote-badge-btn" data-vote-id="${item.product_id}">
              <span>▲</span>
              <span class="upvote-count">${item.votes_count || 0}</span>
            </button>
          </div>
        </div>
      `;
    },

    // 3. Founder Story Card (Used on stories.html)
    storyCard(s) {
      const typeIcon = s.type === 'video' ? '▶' : s.type === 'podcast' ? '🎙' : '📄';
      const timeMeta = `${s.video_duration || '20m'} • ${s.category_name || 'Tech'} • ${s.location || 'Africa'}`;
      const avatarSrc = s.founder_avatar || 'images/founder_robinson.jpg';

      return `
        <div class="col-md-6 col-lg-3 story-grid-item" data-category="${s.category_id || 'devtools'}" data-type="${s.type || 'video'}">
          <div class="story-card-item h-100 d-flex flex-column">
            <div class="story-card-thumb position-relative" onclick="openStoryVideo('${s.founder_name} — ${s.founder_role}', '${s.headline.replace(/'/g, "\\'")}', '${s.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}')">
              <img src="${avatarSrc}" alt="${s.founder_name}" onerror="this.src='images/founder_robinson.jpg'">
              <div class="video-play-btn" style="width: 44px; height: 44px;">
                <span>${typeIcon}</span>
              </div>
            </div>
            <div class="story-card-body d-flex flex-column flex-grow-1 justify-content-between">
              <div>
                <div class="story-time-meta">${timeMeta}</div>
                <h3 class="story-founder-heading">${s.founder_name}</h3>
                <div class="story-founder-role">${s.founder_role}</div>
                <p class="story-founder-blurb">
                  ${s.headline}
                </p>
              </div>
              <div class="pt-2 border-top border-secondary border-opacity-10 mt-3 d-flex align-items-center justify-content-between">
                <a href="story-details.html?id=${s.slug}" class="visit-link">Read story →</a>
                <span class="badge bg-secondary text-white-50 px-2 py-0.5 rounded" style="font-size: 0.65rem;">${s.type.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 4. Category Bento Card (Used on categories.html)
    categoryCard(c) {
      return `
        <div class="col-md-6 col-lg-4">
          <a href="products.html?category=${c.id}" class="category-bento-card text-decoration-none d-block">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="category-card-icon" style="background: ${c.color}20; color: ${c.color}; font-size: 1.5rem; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                ${c.icon}
              </div>
              <span class="badge rounded-pill px-3 py-1 text-white" style="background: ${c.color}; font-size: 0.75rem;">
                ${c.product_count} ${c.product_count === 1 ? 'solution' : 'solutions'}
              </span>
            </div>
            <h3 class="h5 fw-bold text-white mb-2">${c.name}</h3>
            <p class="text-muted small mb-0" style="line-height: 1.6;">
              ${c.description || 'Explore top innovations and products.'}
            </p>
          </a>
        </div>
      `;
    }
  };

  // Expose globally
  window.DiscovaAPI = DiscovaAPI;
  window.DiscovaRenderers = DiscovaRenderers;

})(window);
