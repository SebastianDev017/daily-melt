/* Daily Melt — PDP components (purchase options, tabs, reviews). */

/**
 * Subscribe / one-time selector. Writes the chosen selling plan into Horizon's product form
 * through a hidden `selling_plan` input associated with the form via the `form` attribute.
 */
class DmPurchaseOptions extends HTMLElement {
  connectedCallback() {
    this.form = document.getElementById(this.dataset.formId);
    this.planInput = this.querySelector('[data-dm-selling-plan]');
    this.planSelect = this.querySelector('[data-dm-plan-select]');
    this.hasPlans = this.dataset.hasPlans === 'true';
    this.showButtonPrice = this.dataset.showButtonPrice === 'true';

    this.addEventListener('change', this.#onChange);
    document.addEventListener('click', this.#onCtaClick);

    if (this.form) {
      this.observer = new MutationObserver(() => this.#syncButton());
      this.observer.observe(this.form, { childList: true, subtree: true });
    }

    this.update();
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.#onChange);
    document.removeEventListener('click', this.#onCtaClick);
    this.observer?.disconnect();
  }

  #onChange = (event) => {
    if (event.target.matches('[data-dm-plan-select]')) {
      const sub = this.querySelector('.dm-option__input[value="subscription"]');
      if (sub && !sub.checked) sub.checked = true;
    }
    this.update();
  };

  #onCtaClick = (event) => {
    const cta = event.target.closest('[data-dm-subscribe-cta]');
    if (!cta) return;
    event.preventDefault();
    const sub = this.querySelector('.dm-option__input[value="subscription"]');
    if (sub) {
      sub.checked = true;
      this.update();
    }
    const button = this.#addToCartButton();
    if (button && !button.disabled) {
      button.click();
    } else {
      this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  get selectedCard() {
    const input = this.querySelector('.dm-option__input:checked');
    return input ? input.closest('.dm-option') : null;
  }

  update() {
    const card = this.selectedCard;
    if (!card) return;
    const isSubscription = card.dataset.option === 'subscription';

    if (this.planSelect) {
      const option = this.planSelect.selectedOptions[0];
      if (option) {
        const subCard = this.querySelector('.dm-option[data-option="subscription"]');
        subCard.dataset.price = option.dataset.price;
        subCard.dataset.compare = option.dataset.compare || '';
        const priceEl = subCard.querySelector('[data-dm-sub-price]');
        const compareEl = subCard.querySelector('[data-dm-sub-compare]');
        const perServingEl = subCard.querySelector('[data-dm-per-serving]');
        if (priceEl) priceEl.textContent = option.dataset.price;
        if (compareEl) compareEl.textContent = option.dataset.compare || '';
        if (perServingEl && option.dataset.perServing) perServingEl.textContent = option.dataset.perServing;
      }
    }

    if (this.planInput) {
      if (isSubscription && this.hasPlans) {
        this.planInput.disabled = false;
        if (this.planSelect) this.planInput.value = this.planSelect.value;
      } else {
        this.planInput.disabled = true;
      }
    }

    this.dataset.selected = card.dataset.option;
    this.#syncButton();
    this.#syncStickyBar(card);
  }

  #addToCartButton() {
    return this.form?.querySelector('[ref="addToCartButton"]') ?? null;
  }

  #priceMarkup(card) {
    const price = card.dataset.price || '';
    const compare = card.dataset.compare || '';
    return `<span class="dm-atc-price__now">${price}</span>${compare ? ` <s>${compare}</s>` : ''}`;
  }

  #syncButton() {
    if (!this.showButtonPrice) return;
    const button = this.#addToCartButton();
    const card = this.selectedCard;
    if (!button || !card || button.disabled) return;

    const markup = this.#priceMarkup(card);
    let priceEl = button.querySelector('.dm-atc-price');
    if (!priceEl) {
      priceEl = document.createElement('span');
      priceEl.className = 'dm-atc-price';
      const added = button.querySelector('.add-to-cart__added');
      button.insertBefore(priceEl, added);
    }
    if (priceEl.innerHTML !== markup) priceEl.innerHTML = markup;
  }

  #syncStickyBar(card) {
    const sticky = document.querySelector('sticky-add-to-cart');
    if (!sticky) return;
    const variantEl = sticky.querySelector('.sticky-add-to-cart__variant');
    if (variantEl) {
      variantEl.textContent = card.dataset.label || '';
      variantEl.style.display = card.dataset.label ? '' : 'none';
    }
    const priceEl = sticky.querySelector('.sticky-add-to-cart__price');
    if (priceEl) priceEl.innerHTML = `<span class="dm-sticky-price">${this.#priceMarkup(card)}</span>`;
  }
}

if (!customElements.get('dm-purchase-options')) {
  customElements.define('dm-purchase-options', DmPurchaseOptions);
}

/**
 * Accessible tabs (ingredients). Markup: [role=tablist] > [role=tab], [role=tabpanel].
 */
class DmTabs extends HTMLElement {
  connectedCallback() {
    this.tabs = [...this.querySelectorAll('[role="tab"]')];
    this.panels = [...this.querySelectorAll('[role="tabpanel"]')];
    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.select(index, true));
      tab.addEventListener('keydown', (event) => this.#onKeydown(event, index));
    });
  }

  #onKeydown(event, index) {
    const last = this.tabs.length - 1;
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    this.select(next, true);
  }

  select(index, focus = false) {
    this.tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) {
        tab.focus();
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    });
    this.panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }
}

if (!customElements.get('dm-tabs')) {
  customElements.define('dm-tabs', DmTabs);
}

/**
 * Placeholder reviews list: rating filter, verified filter, sort and "load more".
 */
class DmReviews extends HTMLElement {
  connectedCallback() {
    this.list = this.querySelector('[data-dm-review-list]');
    this.items = [...this.querySelectorAll('[data-dm-review]')];
    this.pageSize = Number(this.dataset.pageSize) || 6;
    this.visibleCount = this.pageSize;
    this.filter = 'all';
    this.sort = 'recent';
    this.loadMore = this.querySelector('[data-dm-load-more]');
    this.emptyState = this.querySelector('[data-dm-empty]');

    this.querySelectorAll('[data-dm-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        this.filter = button.dataset.dmFilter;
        this.querySelectorAll('[data-dm-filter]').forEach((b) =>
          b.setAttribute('aria-pressed', String(b === button))
        );
        this.visibleCount = this.pageSize;
        this.render();
      });
    });

    this.querySelector('[data-dm-sort]')?.addEventListener('change', (event) => {
      this.sort = event.target.value;
      this.render();
    });

    this.querySelector('[data-dm-rating-filter]')?.addEventListener('change', (event) => {
      this.filter = event.target.value;
      this.querySelectorAll('[data-dm-filter]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.dmFilter === this.filter))
      );
      this.visibleCount = this.pageSize;
      this.render();
    });

    this.loadMore?.addEventListener('click', () => {
      this.visibleCount += this.pageSize;
      this.render();
    });

    this.render();
  }

  #matches(item) {
    const rating = Number(item.dataset.rating);
    switch (this.filter) {
      case '5':
      case '4':
      case '3':
      case '2':
      case '1':
        return rating === Number(this.filter);
      case 'verified':
        return item.dataset.verified === 'true';
      case 'media':
        return item.dataset.media === 'true';
      default:
        return true;
    }
  }

  render() {
    const sorted = [...this.items].sort((a, b) => {
      if (this.sort === 'highest') return Number(b.dataset.rating) - Number(a.dataset.rating);
      if (this.sort === 'lowest') return Number(a.dataset.rating) - Number(b.dataset.rating);
      return (Number(b.dataset.date) || 0) - (Number(a.dataset.date) || 0);
    });
    sorted.forEach((item) => this.list.appendChild(item));

    const matching = sorted.filter((item) => this.#matches(item));
    sorted.forEach((item) => {
      item.hidden = true;
    });
    matching.slice(0, this.visibleCount).forEach((item) => {
      item.hidden = false;
    });

    if (this.loadMore) this.loadMore.hidden = matching.length <= this.visibleCount;
    if (this.emptyState) this.emptyState.hidden = matching.length > 0;
  }
}

if (!customElements.get('dm-reviews')) {
  customElements.define('dm-reviews', DmReviews);
}
