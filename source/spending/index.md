---
title: 消费记录
date: 2026-07-14
type: page
---

<style>
  .spending-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .spending-card {
    background: rgba(255,255,255,0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.8);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .spending-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }
  .spending-card .item-name {
    font-size: 1.1em;
    font-weight: 600;
    margin-bottom: 6px;
    color: #1a1a2e;
  }
  .spending-card .item-category {
    display: inline-block;
    font-size: 0.8em;
    padding: 2px 10px;
    border-radius: 20px;
    background: rgba(0,120,215,0.1);
    color: #0078d7;
    margin-bottom: 12px;
  }
  .spending-card .item-detail {
    font-size: 0.9em;
    color: #555;
    line-height: 1.8;
  }
  .spending-card .item-detail .value {
    font-weight: 700;
    color: #1a1a2e;
  }
  .spending-card .item-detail .per-day {
    font-size: 1.2em;
    color: #0078d7;
    font-weight: 700;
  }
  .spending-summary {
    background: linear-gradient(135deg, rgba(0,120,215,0.08), rgba(0,180,216,0.06));
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 16px;
    text-align: center;
  }
  .spending-summary .stat {
    flex: 1;
    min-width: 120px;
  }
  .spending-summary .stat-value {
    font-size: 1.6em;
    font-weight: 700;
    color: #0078d7;
    display: block;
  }
  .spending-summary .stat-label {
    font-size: 0.85em;
    color: #666;
    margin-top: 4px;
    display: block;
  }
</style>

<div class="spending-summary">
  <div class="stat">
    <span class="stat-value" id="totalSpent">--</span>
    <span class="stat-label">总消费</span>
  </div>
  <div class="stat">
    <span class="stat-value" id="totalPerDay">--</span>
    <span class="stat-label">全部日均摊销</span>
  </div>
  <div class="stat">
    <span class="stat-value" id="itemCount">--</span>
    <span class="stat-label">记录数</span>
  </div>
</div>

<div class="spending-grid" id="spendingGrid"></div>

<script>
  const spendingData = <%- JSON.stringify(site.data.spending) %>;

  function calcDays(fromDate) {
    const from = new Date(fromDate);
    const today = new Date();
    const diff = today - from;
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  function renderSpending() {
    const sorted = [...spendingData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const grid = document.getElementById('spendingGrid');

    let totalSpent = 0;
    let totalPerDay = 0;

    sorted.forEach(item => {
      const days = calcDays(item.date);
      const perDay = item.price / days;
      totalSpent += item.price;
      totalPerDay += perDay;

      const card = document.createElement('div');
      card.className = 'spending-card';
      card.innerHTML = `
        <div class="item-name">${escapeHtml(item.name)}</div>
        <span class="item-category">${escapeHtml(item.category || '其他')}</span>
        <div class="item-detail">
          <div>购买日期：${item.date}（已过 <span class="value">${days}</span> 天）</div>
          <div>价格：<span class="value">¥${item.price.toLocaleString()}</span></div>
          <div>日均：<span class="per-day">¥${perDay.toFixed(2)}</span></div>
        </div>
      `;
      grid.appendChild(card);
    });

    document.getElementById('totalSpent').textContent = '¥' + totalSpent.toLocaleString();
    document.getElementById('totalPerDay').textContent = '¥' + totalPerDay.toFixed(2);
    document.getElementById('itemCount').textContent = spendingData.length;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderSpending();
</script>
