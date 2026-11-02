/**
 * Advanced Modern Calculator - Core Logic
 * Features:
 * - BODMAS arithmetic evaluation with parentheses
 * - Full Scientific operations (Trigonometry in DEG/RAD, Log, Exp, Power, Root, Factorial)
 * - Memory Registers (MC, MR, M+, M-, MS)
 * - Calculation History with LocalStorage persistence
 * - Dark / Light theme toggle with LocalStorage persistence
 * - Keyboard shortcuts support & Audio/Haptic touch simulation
 */

class AdvancedCalculator {
  constructor() {
    this.displayElement = document.getElementById('calc-display');
    this.expressionElement = document.getElementById('calc-expression');
    this.degRadBtn = document.getElementById('deg-rad-btn');
    this.memoryBadge = document.getElementById('memory-indicator');
    this.historyList = document.getElementById('history-list');
    this.historyDrawer = document.getElementById('history-drawer');
    this.calcContainer = document.querySelector('.calculator-container');
    
    // States
    this.currentValue = '0';
    this.expression = '';
    this.isResultShown = false;
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
    this.memory = 0;
    this.history = JSON.parse(localStorage.getItem('calc_history') || '[]');

    this.init();
  }

  init() {
    this.loadTheme();
    this.renderHistory();
    this.updateDisplay();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keypad Click Event (Event Delegation)
    document.querySelector('.keypad-wrapper').addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      this.triggerHaptic();

      const val = button.getAttribute('data-val');
      const action = button.getAttribute('data-action');

      if (val !== null) {
        if (action === 'operator') {
          this.handleOperator(val);
        } else {
          this.handleNumber(val);
        }
      } else if (action) {
        this.handleAction(action);
      }
    });

    // Degree / Radian toggle
    this.degRadBtn.addEventListener('click', () => {
      this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
      this.degRadBtn.textContent = this.angleMode;
    });

    // Scientific Mode toggle
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    modeToggleBtn.addEventListener('click', () => {
      this.calcContainer.classList.toggle('sci-expanded');
      modeToggleBtn.classList.toggle('active');
    });

    // History Toggle & Close
    document.getElementById('history-toggle-btn').addEventListener('click', () => {
      this.historyDrawer.classList.add('open');
    });

    document.getElementById('close-history-btn').addEventListener('click', () => {
      this.historyDrawer.classList.remove('open');
    });

    document.getElementById('clear-history-btn').addEventListener('click', () => {
      this.clearHistory();
    });

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Keyboard Support
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  triggerHaptic() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(10); } catch (e) {}
    }
  }

  // Number handling
  handleNumber(num) {
    if (this.isResultShown) {
      this.currentValue = num === '.' ? '0.' : num;
      this.expression = '';
      this.isResultShown = false;
    } else {
      if (num === '.') {
        if (!this.currentValue.includes('.')) {
          this.currentValue += '.';
        }
      } else if (this.currentValue === '0' && num !== '.') {
        this.currentValue = num;
      } else {
        this.currentValue += num;
      }
    }
    this.updateDisplay();
  }

  // Operator handling (+, -, *, /)
  handleOperator(op) {
    if (this.isResultShown) {
      this.expression = `${this.currentValue} ${op} `;
      this.isResultShown = false;
      this.currentValue = '0';
    } else {
      if (this.currentValue !== '0' || this.expression === '') {
        this.expression += `${this.currentValue} ${op} `;
        this.currentValue = '0';
      } else if (this.expression.endsWith(' ') && this.expression.length >= 3) {
        // Replace last operator
        this.expression = this.expression.slice(0, -3) + ` ${op} `;
      }
    }
    this.updateDisplay();
  }

  // Handle Various Actions & Functions
  handleAction(action) {
    switch (action) {
      case 'all-clear':
        this.currentValue = '0';
        this.expression = '';
        this.isResultShown = false;
        break;

      case 'delete':
        if (this.isResultShown) {
          this.expression = '';
          this.isResultShown = false;
        } else if (this.currentValue.length > 1) {
          this.currentValue = this.currentValue.slice(0, -1);
        } else {
          this.currentValue = '0';
        }
        break;

      case 'bracket':
        // Append bracket based on current context
        this.handleBracket();
        break;

      case 'percent':
        const valP = parseFloat(this.currentValue);
        if (!isNaN(valP)) {
          this.currentValue = this.formatNumber(valP / 100);
        }
        break;

      case 'negate':
        if (this.currentValue !== '0') {
          this.currentValue = this.currentValue.startsWith('-')
            ? this.currentValue.slice(1)
            : '-' + this.currentValue;
        }
        break;

      case 'calculate':
        this.computeFinal();
        break;

      // Scientific Math
      case 'sin':
      case 'cos':
      case 'tan':
      case 'asin':
      case 'acos':
      case 'atan':
        this.handleTrig(action);
        break;

      case 'sqrt':
        this.handleUnary((x) => (x < 0 ? NaN : Math.sqrt(x)), '√');
        break;

      case 'cbrt':
        this.handleUnary((x) => Math.cbrt(x), '∛');
        break;

      case 'square':
        this.handleUnary((x) => Math.pow(x, 2), 'sqr');
        break;

      case 'cube':
        this.handleUnary((x) => Math.pow(x, 3), 'cube');
        break;

      case 'pow':
        this.expression += `${this.currentValue} ^ `;
        this.currentValue = '0';
        break;

      case 'inv':
        this.handleUnary((x) => (x === 0 ? NaN : 1 / x), '1/');
        break;

      case 'log':
        this.handleUnary((x) => (x <= 0 ? NaN : Math.log10(x)), 'log');
        break;

      case 'ln':
        this.handleUnary((x) => (x <= 0 ? NaN : Math.log(x)), 'ln');
        break;

      case 'abs':
        this.handleUnary((x) => Math.abs(x), 'abs');
        break;

      case 'fact':
        this.handleFactorial();
        break;

      case 'pi':
        this.currentValue = Math.PI.toString();
        this.isResultShown = false;
        break;

      case 'e':
        this.currentValue = Math.E.toString();
        this.isResultShown = false;
        break;

      case 'rand':
        this.currentValue = Math.random().toFixed(4).toString();
        this.isResultShown = false;
        break;

      // Memory
      case 'mc':
        this.memory = 0;
        this.updateMemoryBadge();
        break;
      case 'mr':
        this.currentValue = this.memory.toString();
        this.isResultShown = false;
        break;
      case 'm-add':
        this.memory += parseFloat(this.currentValue) || 0;
        this.updateMemoryBadge();
        break;
      case 'm-sub':
        this.memory -= parseFloat(this.currentValue) || 0;
        this.updateMemoryBadge();
        break;
      case 'ms':
        this.memory = parseFloat(this.currentValue) || 0;
        this.updateMemoryBadge();
        break;
    }
    this.updateDisplay();
  }

  handleBracket() {
    if (this.isResultShown) {
      this.expression = '(';
      this.currentValue = '0';
      this.isResultShown = false;
      return;
    }

    const openCount = (this.expression.match(/\(/g) || []).length;
    const closeCount = (this.expression.match(/\)/g) || []).length;

    if (openCount > closeCount && this.currentValue !== '0') {
      this.expression += `${this.currentValue} ) `;
      this.currentValue = '0';
    } else {
      this.expression += '( ';
    }
  }

  handleTrig(func) {
    let x = parseFloat(this.currentValue);
    if (isNaN(x)) return;

    let rad = this.angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
    let res;

    switch (func) {
      case 'sin':
        res = Math.sin(rad);
        // Fix float precision e.g. sin(180 deg) = 0
        if (Math.abs(res) < 1e-15) res = 0;
        break;
      case 'cos':
        res = Math.cos(rad);
        if (Math.abs(res) < 1e-15) res = 0;
        break;
      case 'tan':
        if (this.angleMode === 'DEG' && (x - 90) % 180 === 0) {
          res = NaN;
        } else {
          res = Math.tan(rad);
          if (Math.abs(res) < 1e-15) res = 0;
        }
        break;
      case 'asin':
        res = Math.asin(x);
        if (this.angleMode === 'DEG') res = (res * 180) / Math.PI;
        break;
      case 'acos':
        res = Math.acos(x);
        if (this.angleMode === 'DEG') res = (res * 180) / Math.PI;
        break;
      case 'atan':
        res = Math.atan(x);
        if (this.angleMode === 'DEG') res = (res * 180) / Math.PI;
        break;
    }

    if (isNaN(res)) {
      this.currentValue = 'Error';
    } else {
      this.currentValue = this.formatNumber(res);
    }
    this.isResultShown = true;
  }

  handleUnary(mathFn, label) {
    const x = parseFloat(this.currentValue);
    if (isNaN(x)) return;

    const res = mathFn(x);
    if (isNaN(res) || !isFinite(res)) {
      this.currentValue = 'Error';
    } else {
      this.currentValue = this.formatNumber(res);
    }
    this.isResultShown = true;
  }

  handleFactorial() {
    const n = parseInt(this.currentValue, 10);
    if (isNaN(n) || n < 0 || n > 170) {
      this.currentValue = 'Error';
    } else {
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;
      this.currentValue = this.formatNumber(fact);
    }
    this.isResultShown = true;
  }

  computeFinal() {
    let fullExpr = this.expression;
    if (this.currentValue !== '0' || !this.expression.endsWith(') ')) {
      fullExpr += this.currentValue;
    }

    // Auto close pending parentheses
    const openCount = (fullExpr.match(/\(/g) || []).length;
    const closeCount = (fullExpr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      fullExpr += ' )'.repeat(openCount - closeCount);
    }

    const cleanExpr = fullExpr.trim();
    if (!cleanExpr) return;

    try {
      // Evaluate mathematical string safely
      const result = this.safeEvaluate(cleanExpr);

      if (isNaN(result) || !isFinite(result)) {
        this.currentValue = 'Error';
      } else {
        const formatted = this.formatNumber(result);
        this.saveHistory(cleanExpr, formatted);
        this.expression = `${cleanExpr} =`;
        this.currentValue = formatted;
        this.isResultShown = true;
      }
    } catch (err) {
      this.currentValue = 'Error';
    }
    this.updateDisplay();
  }

  safeEvaluate(expr) {
    // Replace human operators with JS compatible operators
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    // Only allow numbers, math operators, decimals and parentheses
    if (!/^[0-9+\-*/().\s*]+$/.test(sanitized)) {
      throw new Error('Invalid Expression');
    }

    // Evaluate using Function constructor rather than direct eval
    return new Function(`'use strict'; return (${sanitized});`)();
  }

  formatNumber(val) {
    if (typeof val !== 'number') val = Number(val);
    if (isNaN(val)) return 'Error';

    // Exponential if exceedingly high or low
    if (Math.abs(val) > 1e12 || (Math.abs(val) < 1e-6 && val !== 0)) {
      return val.toExponential(6).replace(/\.?0+e/, 'e');
    }

    // Rounding to prevent binary floating point artifacts like 0.1 + 0.2 = 0.30000000000000004
    const rounded = parseFloat(val.toFixed(10));
    return rounded.toString();
  }

  updateDisplay() {
    this.expressionElement.textContent = this.expression;
    this.displayElement.textContent = this.currentValue;

    // Adjust font size dynamically if input gets too long
    if (this.currentValue.length > 12) {
      this.displayElement.style.fontSize = '1.45rem';
    } else if (this.currentValue.length > 8) {
      this.displayElement.style.fontSize = '1.85rem';
    } else {
      this.displayElement.style.fontSize = '2.3rem';
    }
  }

  updateMemoryBadge() {
    if (this.memory !== 0) {
      this.memoryBadge.classList.remove('hidden');
    } else {
      this.memoryBadge.classList.add('hidden');
    }
  }

  // History System
  saveHistory(expr, result) {
    this.history.unshift({ expr, result, time: new Date().toLocaleTimeString() });
    if (this.history.length > 30) this.history.pop();
    localStorage.setItem('calc_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<p class="empty-history-text">No calculations yet</p>';
      return;
    }

    this.historyList.innerHTML = this.history
      .map(
        (item) => `
        <div class="history-item" data-res="${item.result}">
          <div class="history-expr">${item.expr} =</div>
          <div class="history-res">${item.result}</div>
        </div>
      `
      )
      .join('');

    // Click to recall item
    this.historyList.querySelectorAll('.history-item').forEach((elem) => {
      elem.addEventListener('click', () => {
        this.currentValue = elem.getAttribute('data-res');
        this.isResultShown = true;
        this.updateDisplay();
        this.historyDrawer.classList.remove('open');
      });
    });
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('calc_history');
    this.renderHistory();
  }

  // Theme Management
  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('calc_theme', nextTheme);
    
    const icon = document.querySelector('#theme-toggle-btn i');
    icon.className = nextTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('calc_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const icon = document.querySelector('#theme-toggle-btn i');
    if (icon) {
      icon.className = savedTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  // Keyboard Shortcuts
  handleKeyboard(e) {
    if (e.key >= '0' && e.key <= '9') {
      this.handleNumber(e.key);
    } else if (e.key === '.') {
      this.handleNumber('.');
    } else if (['+', '-', '*', '/'].includes(e.key)) {
      this.handleOperator(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      this.computeFinal();
    } else if (e.key === 'Backspace') {
      this.handleAction('delete');
    } else if (e.key === 'Escape') {
      this.handleAction('all-clear');
    } else if (e.key === '(' || e.key === ')') {
      this.handleBracket();
    } else if (e.key === '%') {
      this.handleAction('percent');
    }
  }
}

// Instantiate on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  window.calculator = new AdvancedCalculator();
});

