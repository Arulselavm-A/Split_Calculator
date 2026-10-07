const defaultTitle = 'Travel Budget';
const members = [];
const defaultExpenses = [];
const STORAGE_KEY = 'split-calculator-state-v1';

const state = {
  title: defaultTitle,
  members: [...members],
  expenses: [...defaultExpenses]
};

let chartInstance = null;
let activeChartType = 'doughnut';

const tripTitleInput = document.getElementById('tripTitle');
const personNameInput = document.getElementById('personName');
const personCountrySelect = document.getElementById('personCountry');
const personMobileInput = document.getElementById('personMobile');
const pickContactBtn = document.getElementById('pickContactBtn');
const contactPhoneSelect = document.getElementById('contactPhone');
const contactPickerStatus = document.getElementById('contactPickerStatus');
const peopleList = document.getElementById('peopleList');
const expenseForm = document.getElementById('expenseForm');
const expenseTitleInput = document.getElementById('expenseTitle');
const expenseAmountInput = document.getElementById('expenseAmount');
const expensePayerSelect = document.getElementById('expensePayer');
const splitModeSelect = document.getElementById('splitMode');
const memberSplitList = document.getElementById('memberSplitList');
const personBreakdown = document.getElementById('personBreakdown');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const totalSpendValue = document.getElementById('totalSpendValue');
const perPersonValue = document.getElementById('perPersonValue');
const expenseTableBody = document.getElementById('expenseTableBody');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const selectedSplitSummary = document.getElementById('selectedSplitSummary');
const selectAllMembersBtn = document.getElementById('selectAllMembers');
const clearSelectedMembersBtn = document.getElementById('clearSelectedMembers');
const chartTypeButtons = document.querySelectorAll('.chart-type-btn');

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value || 0);
}

function normalizeMember(member) {
  if (!member || typeof member !== 'object') {
    return { name: String(member || '').trim(), country: 'IN', mobile: '' };
  }

  return {
    name: String(member.name || '').trim(),
    country: String(member.country || 'IN').trim() || 'IN',
    mobile: String(member.mobile || '').trim()
  };
}

function getMemberNameList() {
  return state.members.map((member) => normalizeMember(member).name);
}

function getWhatsAppNumber(person) {
  const member = normalizeMember(person);
  const callingCodes = {
    IN: '91', US: '1', GB: '44', AE: '971', SA: '966', AU: '61',
    CA: '1', SG: '65', MY: '60', DE: '49', FR: '33', IT: '39',
    ES: '34', NL: '31', SE: '46', NO: '47', DK: '45', BE: '32',
    CH: '41', JP: '81', KR: '82', NZ: '64', ZA: '27', NG: '234',
    EG: '20', PK: '92', BD: '880', LK: '94', NP: '977', TH: '66',
    VN: '84', ID: '62', PH: '63'
  };
  const callingCode = callingCodes[member.country];
  if (!callingCode || !member.mobile) return '';

  let number = member.mobile.replace(/\D/g, '');
  if (member.mobile.startsWith('+')) {
    return /^[1-9]\d{6,14}$/.test(number) ? number : '';
  }
  if (number.startsWith('00')) {
    number = number.slice(2);
    return /^[1-9]\d{6,14}$/.test(number) ? number : '';
  }
  if (member.country === 'IN' && number.length === 12 && number.startsWith(callingCode)) {
    number = number.slice(callingCode.length);
  }
  if (member.country !== 'IT') number = number.replace(/^0+/, '');
  if (member.country === 'IN' && !/^[6-9]\d{9}$/.test(number)) return '';
  if (!/^\d{7,14}$/.test(number)) return '';

  const internationalNumber = callingCode + number;
  return internationalNumber.length <= 15 ? internationalNumber : '';
}

function getMemberByName(name) {
  return state.members.find((member) => normalizeMember(member).name.toLowerCase() === String(name).trim().toLowerCase());
}

function getMasterMemberName() {
  return getMemberNameList()[0] || '';
}

function loadSavedState() {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) {
      return null;
    }

    const parsed = JSON.parse(savedState);
    if (!parsed || !Array.isArray(parsed.members)) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      title: state.title,
      members: state.members,
      expenses: state.expenses
    }));
  } catch (error) {
    // Ignore storage quota / browser issues gracefully.
  }
}

function hydrateStateFromStorage() {
  const savedState = loadSavedState();

  if (!savedState) {
    state.title = defaultTitle;
    state.members = [...members].map((member) => normalizeMember(member));
    state.expenses = [...defaultExpenses];
    return;
  }

  state.title = savedState.title || defaultTitle;
  state.members = Array.isArray(savedState.members) && savedState.members.length > 0
    ? savedState.members.map((member) => normalizeMember(member)).filter((member) => member.name)
    : [...members].map((member) => normalizeMember(member));
  state.expenses = Array.isArray(savedState.expenses) ? savedState.expenses : [...defaultExpenses];
}

function updateTitle() {
  state.title = tripTitleInput.value.trim() || defaultTitle;
  document.title = `${state.title} - Split Calculator`;
  saveState();
}

function getSelectedMembers() {
  const selected = Array.from(memberSplitList.querySelectorAll('input:checked'))
    .map((checkbox) => checkbox.value);

  if (selected.length === 0) {
    return getMemberNameList();
  }

  return selected;
}

function updateSelectedSplitSummary() {
  const selected = Array.from(memberSplitList.querySelectorAll('input:checked')).map((input) => input.value);

  if (selected.length === 0) {
    selectedSplitSummary.textContent = 'Selected: none';
    return;
  }

  if (selected.length === state.members.length) {
    selectedSplitSummary.textContent = 'Selected: all members';
    return;
  }

  selectedSplitSummary.textContent = `Selected: ${selected.join(', ')}`;
}

function renderPeopleList() {
  peopleList.innerHTML = '';

  if (state.members.length === 0) {
    peopleList.innerHTML = '<div class="empty-state">No people added yet.</div>';
    return;
  }

  const masterName = getMasterMemberName();

  state.members.forEach((person) => {
    const member = normalizeMember(person);
    const chip = document.createElement('div');
    const isMaster = member.name === masterName;
    chip.className = `person-chip${isMaster ? ' master-person' : ''}`;
    chip.innerHTML = `
      <div class="person-chip-content">
        <span>${member.name}${isMaster ? ' ★' : ''}</span>
        ${member.mobile ? `<small>${member.country || 'IN'} ${member.mobile}</small>` : ''}
      </div>
      <button class="remove-btn" type="button" data-name="${member.name}" aria-label="Remove ${member.name}">×</button>
    `;
    peopleList.appendChild(chip);
  });
}

function renderPayerOptions() {
  const memberNames = getMemberNameList();
  expensePayerSelect.innerHTML = memberNames
    .map((person) => `<option value="${person}">${person}</option>`)
    .join('');

  if (memberNames.length > 0) {
    expensePayerSelect.value = memberNames[0];
  }
}

function renderSplitOptions() {
  const memberNames = getMemberNameList();
  memberSplitList.innerHTML = memberNames
    .map((person) => `
      <label class="split-option">
        <input type="checkbox" value="${person}" checked />
        <span>${person}</span>
      </label>
    `)
    .join('');

  memberSplitList.querySelectorAll('input').forEach((checkbox) => {
    checkbox.addEventListener('change', updateSelectedSplitSummary);
  });

  updateSelectedSplitSummary();
}

function renderExpenseTable() {
  expenseTableBody.innerHTML = '';

  if (state.expenses.length === 0) {
    expenseTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No expenses have been added yet.</td></tr>';
    return;
  }

  state.expenses.forEach((expense) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="expense-tag">${expense.title}</span></td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>${expense.payer}</td>
      <td>${expense.sharedWith.join(', ')}</td>
      <td>
        <button class="remove-btn" type="button" data-expense-id="${expense.id}" aria-label="Delete expense">×</button>
      </td>
    `;
    expenseTableBody.appendChild(row);
  });
}

function computeSummary() {
  const memberDetails = getMemberNameList().map((member) => {
    const paid = state.expenses
      .filter((expense) => expense.payer === member)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const share = state.expenses.reduce((sum, expense) => {
      const splitMembers = expense.sharedWith.length > 0 ? expense.sharedWith : getMemberNameList();
      if (splitMembers.includes(member)) {
        return sum + (Number(expense.amount) / splitMembers.length);
      }
      return sum;
    }, 0);

    const balance = paid - share;

    return {
      name: member,
      paid,
      share,
      balance
    };
  });

  const categoryTotals = state.expenses.reduce((acc, expense) => {
    const key = expense.title.trim() || 'Expense';
    acc[key] = (acc[key] || 0) + Number(expense.amount);
    return acc;
  }, {});

  const totalSpend = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const perPersonValueTotal = state.members.length > 0 ? totalSpend / state.members.length : 0;

  totalSpendValue.textContent = formatCurrency(totalSpend);
  perPersonValue.textContent = formatCurrency(perPersonValueTotal);

  personBreakdown.innerHTML = memberDetails
    .map((person) => `
      <div class="person-row">
        <div class="person-name">${person.name}</div>
        <div class="person-meta">Paid ${formatCurrency(person.paid)}</div>
        <div class="person-meta">Share ${formatCurrency(person.share)}</div>
        <span class="amount-pill ${person.balance < 0 ? 'negative' : ''}">
          ${person.balance >= 0 ? 'Gets back' : 'Owes'} ${formatCurrency(Math.abs(person.balance))}
        </span>
      </div>
    `)
    .join('');

  categoryBreakdown.innerHTML = Object.entries(categoryTotals)
    .map(([category, amount], index) => `
      <div class="category-pill" style="background: linear-gradient(135deg, rgba(205, 180, 219, 0.18), rgba(189, 224, 254, 0.2)); border-left: 6px solid ${['#cdb4db', '#ffc8dd', '#bde0fe', '#a2d2ff', '#ffafcc', '#caffbf'][index % 6]};">
        <div>
          <strong>${category}</strong>
          <small>Category total</small>
        </div>
        <span>${formatCurrency(amount)}</span>
      </div>
    `)
    .join('');

  return { memberDetails, totalSpend };
}

function renderChart() {
  const { memberDetails } = computeSummary();

  const labels = memberDetails.map((item) => item.name);
  const paidValues = memberDetails.map((item) => item.paid);
  const palette = ['#8b5cf6', '#67b7ff', '#67d7b5', '#f7c97a', '#ff9fc9', '#b8b5ff'];

  const ctx = document.getElementById('spendChart');
  if (!ctx) {
    return;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Paid by person',
        data: paidValues,
        backgroundColor: palette.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 10,
        borderRadius: activeChartType === 'bar' ? 12 : 0,
        borderSkipped: false,
        tension: 0.28
      }
    ]
  };

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: activeChartType,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      layout: {
        padding: {
          top: 12,
          bottom: 6,
          left: 8,
          right: 8
        }
      },
      cutout: activeChartType === 'doughnut' ? '58%' : 0,
      plugins: {
        legend: {
          position: activeChartType === 'doughnut' ? 'right' : 'bottom',
          labels: {
            color: '#334155',
            boxWidth: 12,
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              family: 'Inter',
              size: 12,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(24, 32, 45, 0.92)',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const value = typeof context.parsed === 'object' ? context.parsed.y : context.parsed;
              return `${context.label}: ${formatCurrency(value)}`;
            }
          }
        }
      },
      scales: activeChartType === 'bar'
        ? {
            x: {
              grid: { display: false },
              ticks: { color: '#475569', font: { weight: '600' } },
              border: { display: false }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(148, 163, 184, 0.2)',
                drawBorder: false
              },
              ticks: {
                color: '#475569',
                padding: 8,
                callback: (value) => `₹${value}`
              },
              border: { display: false }
            }
          }
        : undefined
    }
  });
}

function renderAll() {
  const recipients = document.getElementById('whatsAppRecipients');
  recipients.replaceChildren();
  recipients.hidden = true;
  tripTitleInput.value = state.title || defaultTitle;
  updateTitle();
  renderPeopleList();
  renderPayerOptions();
  renderSplitOptions();
  renderExpenseTable();
  renderChart();
  saveState();
}

function resetAllState() {
  state.title = defaultTitle;
  state.members = [...members].map((member) => normalizeMember(member));
  state.expenses = [...defaultExpenses];

  tripTitleInput.value = defaultTitle;
  personNameInput.value = '';
  personMobileInput.value = '';
  personMobileInput.setCustomValidity('');
  contactPhoneSelect.replaceChildren();
  contactPhoneSelect.hidden = true;
  contactPickerStatus.hidden = true;
  expenseForm.reset();
  splitModeSelect.value = 'selected';
  selectedSplitSummary.textContent = 'Selected: all members';

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Ignore storage removal errors.
  }

  renderAll();
}

function setChartType(type) {
  activeChartType = type;
  chartTypeButtons.forEach((button) => {
    const isActive = button.dataset.chartType === type;
    button.classList.toggle('active', isActive);
  });
  renderChart();
}

async function pickPhoneContact() {
  contactPickerStatus.hidden = true;
  if (!window.isSecureContext || typeof navigator.contacts?.select !== 'function') {
    contactPickerStatus.textContent = 'Phone contacts are unavailable in this browser. Try Android Chrome over HTTPS, or enter the number manually.';
    contactPickerStatus.hidden = false;
    return;
  }

  pickContactBtn.disabled = true;
  try {
    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!contacts.length) return;

    const contact = contacts[0];
    const numbers = (contact.tel || [])
      .filter((number) => typeof number === 'string' && number.trim())
      .map((number) => number.trim());
    if (!numbers.length) {
      contactPickerStatus.textContent = 'This contact has no phone number. Choose another contact.';
      contactPickerStatus.hidden = false;
      return;
    }

    contactPhoneSelect.replaceChildren();
    numbers.forEach((number) => {
      const option = document.createElement('option');
      option.value = number;
      option.textContent = number;
      contactPhoneSelect.appendChild(option);
    });
    contactPhoneSelect.hidden = numbers.length === 1;
    if (contact.name?.[0]) personNameInput.value = contact.name[0];
    personMobileInput.value = numbers[0];
    personMobileInput.setCustomValidity('');
    if (numbers.length > 1) contactPhoneSelect.focus();
    else personMobileInput.focus();
  } catch (error) {
    if (error.name !== 'AbortError') {
      contactPickerStatus.textContent = 'Could not open phone contacts. Try again or enter the number manually.';
      contactPickerStatus.hidden = false;
    }
  } finally {
    pickContactBtn.disabled = false;
  }
}

function addPerson() {
  const name = personNameInput.value.trim();
  const country = personCountrySelect.value || 'IN';
  const mobile = personMobileInput.value.trim();

  if (!name) {
    personNameInput.focus();
    return;
  }

  if (!getWhatsAppNumber({ name, country, mobile })) {
    personMobileInput.focus();
    personMobileInput.setCustomValidity('Enter a valid mobile number for the selected country, or an international number starting with +');
    personMobileInput.reportValidity();
    return;
  }

  personMobileInput.setCustomValidity('');

  if (state.members.some((member) => normalizeMember(member).name.toLowerCase() === name.toLowerCase())) {
    personNameInput.value = '';
    personMobileInput.value = '';
    personNameInput.focus();
    return;
  }

  state.members.push({ name, country, mobile });
  personNameInput.value = '';
  personMobileInput.value = '';
  contactPhoneSelect.replaceChildren();
  contactPhoneSelect.hidden = true;
  contactPickerStatus.hidden = true;
  personCountrySelect.value = 'IN';
  renderAll();
}

function removePerson(name) {
  state.members = state.members.filter((member) => normalizeMember(member).name !== name);

  state.expenses = state.expenses.map((expense) => ({
    ...expense,
    payer: expense.payer === name ? getMemberNameList()[0] || '' : expense.payer,
    sharedWith: expense.sharedWith.filter((member) => member !== name)
  }));

  if (state.members.length === 0) {
    state.expenses = [];
  }

  renderAll();
}

function addExpense(event) {
  event.preventDefault();

  if (state.members.length === 0) {
    return;
  }

  const title = expenseTitleInput.value.trim();
  const amount = Number(expenseAmountInput.value);
  const payer = expensePayerSelect.value;

  if (!title || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  const splitMode = splitModeSelect.value;
  const memberNames = getMemberNameList();
  const sharedWith = splitMode === 'all'
    ? [...memberNames]
    : getSelectedMembers();

  const newExpense = {
    id: Date.now(),
    title,
    amount,
    payer,
    sharedWith: sharedWith.length > 0 ? sharedWith : [...memberNames]
  };

  state.expenses.push(newExpense);
  expenseForm.reset();
  splitModeSelect.value = 'selected';
  renderAll();
}

function removeExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== Number(id));
  renderAll();
}

function getPersonBalance(name) {
  const paid = state.expenses
    .filter((expense) => expense.payer === name)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const share = state.expenses.reduce((sum, expense) => {
    const splitMembers = expense.sharedWith.length > 0 ? expense.sharedWith : getMemberNameList();
    return splitMembers.includes(name) ? sum + (Number(expense.amount) / splitMembers.length) : sum;
  }, 0);

  return paid - share;
}

function getDebtorsForMaster() {
  const masterName = getMasterMemberName();
  if (!masterName) return [];

  return getMemberNameList()
    .filter((memberName) => memberName !== masterName)
    .map((memberName) => ({
      name: memberName,
      balance: getPersonBalance(memberName)
    }))
    .filter((member) => member.balance < 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

function buildPersonalMessage(name) {
  const totalSpend = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const masterName = getMasterMemberName();
  const balance = getPersonBalance(name);

  if (!masterName) {
    return [
      `*${state.title || defaultTitle}*`,
      '',
      `Hi ${name}, add your group members first.`,
      '',
      `Total spend: ${formatCurrency(totalSpend)}`
    ].join('\n');
  }

  if (name === masterName) {
    const otherMembers = getMemberNameList().filter((memberName) => memberName !== masterName);
    const debtor = otherMembers
      .map((memberName) => ({ name: memberName, balance: getPersonBalance(memberName) }))
      .filter((member) => member.balance < 0)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];

    const creditor = otherMembers
      .map((memberName) => ({ name: memberName, balance: getPersonBalance(memberName) }))
      .filter((member) => member.balance > 0)
      .sort((a, b) => b.balance - a.balance)[0];

    if (balance > 0) {
      const payFrom = creditor ? creditor.name : 'the group';
      return [
        `*${state.title || defaultTitle}*`,
        '',
        `Hi ${name}, you should receive ${formatCurrency(Math.abs(balance))} from ${payFrom}.`,
        '',
        `Total spend: ${formatCurrency(totalSpend)}`
      ].join('\n');
    }

    if (balance < 0) {
      const payTo = debtor ? debtor.name : 'the group';
      return [
        `*${state.title || defaultTitle}*`,
        '',
        `Hi ${name}, you need to pay ${formatCurrency(Math.abs(balance))} to ${payTo}.`,
        '',
        `Total spend: ${formatCurrency(totalSpend)}`
      ].join('\n');
    }

    return [
      `*${state.title || defaultTitle}*`,
      '',
      `Hi ${name}, your split is settled up.`,
      '',
      `Total spend: ${formatCurrency(totalSpend)}`
    ].join('\n');
  }

  if (balance > 0) {
    return [
      `*${state.title || defaultTitle}*`,
      '',
      `Hi ${name}, you should receive ${formatCurrency(Math.abs(balance))} from ${masterName}.`,
      '',
      `Total spend: ${formatCurrency(totalSpend)}`
    ].join('\n');
  }

  if (balance < 0) {
    return [
      `*${state.title || defaultTitle}*`,
      '',
      `Hi ${name}, you need to pay ${formatCurrency(Math.abs(balance))} to ${masterName}.`,
      '',
      `Total spend: ${formatCurrency(totalSpend)}`
    ].join('\n');
  }

  return [
    `*${state.title || defaultTitle}*`,
    '',
    `Hi ${name}, your split is settled up.`,
    '',
    `Total spend: ${formatCurrency(totalSpend)}`
  ].join('\n');
}

function shareSplitOnWhatsApp() {
  const recipients = document.getElementById('whatsAppRecipients');
  recipients.replaceChildren();
  recipients.hidden = true;
  const memberNumbers = state.members
    .map((member) => ({ name: normalizeMember(member).name, mobile: getWhatsAppNumber(member) }))
    .filter((member) => member.mobile);

  if (memberNumbers.length === 0) {
    const message = buildPersonalMessage(getMemberNameList()[0] || '');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    return;
  }

  memberNumbers.forEach((member) => {
    const personalMessage = buildPersonalMessage(member.name);
    const url = `https://wa.me/${member.mobile}?text=${encodeURIComponent(personalMessage)}`;
    const link = document.createElement('a');
    link.className = 'secondary-btn whatsapp-btn';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `WhatsApp: ${member.name}`;
    recipients.appendChild(link);
  });
  recipients.hidden = false;
}

function openGooglePaySplit() {
  const masterName = getMasterMemberName();
  const debtors = getDebtorsForMaster();

  if (!masterName || debtors.length === 0) {
    window.open('https://pay.google.com/', '_blank');
    return;
  }

  const total = debtors.reduce((sum, member) => sum + Math.abs(member.balance), 0);
  const lines = [
    `*${state.title || defaultTitle}*`,
    '',
    `Master: ${masterName}`,
    `Receivable total: ${formatCurrency(total)}`,
    '',
    ...debtors.map((member) => `${member.name}: pay ${formatCurrency(Math.abs(member.balance))}`),
    '',
    'Use Google Pay split with only these members.'
  ];

  const summary = encodeURIComponent(lines.join('\n'));
  window.open(`https://pay.google.com/?text=${summary}`, '_blank');
}

function exportToExcel() {
  const workbook = XLSX.utils.book_new();

  const summaryRows = getMemberNameList().map((member) => {
    const paid = state.expenses
      .filter((expense) => expense.payer === member)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const share = state.expenses.reduce((sum, expense) => {
      const splitMembers = expense.sharedWith.length > 0 ? expense.sharedWith : getMemberNameList();
      return splitMembers.includes(member) ? sum + (Number(expense.amount) / splitMembers.length) : sum;
    }, 0);

    return {
      Person: member,
      'Total Paid': paid,
      'Total Share': share,
      Balance: paid - share
    };
  });

  const expenseRows = state.expenses.map((expense) => ({
    Expense: expense.title,
    Amount: expense.amount,
    'Paid By': expense.payer,
    'Split With': expense.sharedWith.join(', ')
  }));

  const categoryRows = Object.entries(state.expenses.reduce((acc, expense) => {
    const key = expense.title.trim() || 'Expense';
    acc[key] = (acc[key] || 0) + Number(expense.amount);
    return acc;
  }, {})).map(([category, amount]) => ({ Category: category, Amount: amount }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
  const chartDataSheet = XLSX.utils.json_to_sheet(categoryRows);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');
  XLSX.utils.book_append_sheet(workbook, chartDataSheet, 'Chart Data');

  XLSX.writeFile(workbook, `${(state.title || 'split-calculator').replace(/\s+/g, '_')}.xlsx`);
}

tripTitleInput.addEventListener('input', updateTitle);
pickContactBtn.addEventListener('click', pickPhoneContact);
contactPhoneSelect.addEventListener('change', () => {
  personMobileInput.value = contactPhoneSelect.value;
  personMobileInput.setCustomValidity('');
});
personMobileInput.addEventListener('input', () => {
  personMobileInput.setCustomValidity('');
  contactPhoneSelect.hidden = true;
  contactPickerStatus.hidden = true;
});
document.getElementById('addPersonBtn').addEventListener('click', addPerson);
document.getElementById('shareWhatsAppBtn').addEventListener('click', shareSplitOnWhatsApp);
document.getElementById('createGooglePaySplitBtn').addEventListener('click', openGooglePaySplit);
resetAllBtn.addEventListener('click', resetAllState);
chartTypeButtons.forEach((button) => {
  button.addEventListener('click', () => setChartType(button.dataset.chartType));
});
selectAllMembersBtn.addEventListener('click', () => {
  memberSplitList.querySelectorAll('input').forEach((checkbox) => {
    checkbox.checked = true;
  });
  updateSelectedSplitSummary();
});
clearSelectedMembersBtn.addEventListener('click', () => {
  memberSplitList.querySelectorAll('input').forEach((checkbox) => {
    checkbox.checked = false;
  });
  updateSelectedSplitSummary();
});
personNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addPerson();
  }
});

personMobileInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addPerson();
  }
});

peopleList.addEventListener('click', (event) => {
  const target = event.target.closest('.remove-btn');
  if (!target) return;

  const name = target.dataset.name;
  removePerson(name);
});

expenseTableBody.addEventListener('click', (event) => {
  const target = event.target.closest('.remove-btn');
  if (!target) return;

  const expenseId = target.dataset.expenseId;
  removeExpense(expenseId);
});

expenseForm.addEventListener('submit', addExpense);
downloadExcelBtn.addEventListener('click', exportToExcel);

hydrateStateFromStorage();
renderAll();
