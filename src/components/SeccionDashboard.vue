<template>
  <div>
    <div class="balance azul">
      <div class="lbl"><icon name="wallet" :size="14" color="#fff"></icon> Efectivo en Caja</div>
      <div class="val">{{ app.fmt(app.saldoCaja) }}</div>
      <div class="sub">Insumos: {{ app.fmt(app.valorInsumos) }} · Desde {{ app.fmtFecha(app.cfg.periodoInicio) }}</div>
    </div>

    <div v-if="app.insumosBajoStock.length" class="alert-box-stock">
      <div class="alert-chip alert-low" @click="app.ir('inventario')">
        <icon name="alert" :size="14" color="#fff"></icon>
        <b>{{ app.insumosBajoStock.length }}</b> insumo(s) bajo(s)
      </div>
    </div>

    <div class="grid2">
      <div class="stat">
        <div class="lbl"><icon name="cart" :size="12"></icon> Pizzas vendidas</div>
        <div class="val" style="color:var(--pri)">{{ app.pizzasVendidasPeriodo }}</div>
      </div>
      <div class="stat">
        <div class="lbl"><icon name="dollar" :size="12"></icon> Ganancia neta</div>
        <div class="val" :class="app.gananciaNetaPeriodo >= 0 ? 'pos' : 'neg'">{{ app.fmt(app.gananciaNetaPeriodo) }}</div>
      </div>
      <div class="stat">
        <div class="lbl"><icon name="trend" :size="12"></icon> Ventas</div>
        <div class="val">{{ app.fmt(app.ventasPeriodo) }}</div>
      </div>
      <div class="stat">
        <div class="lbl"><icon name="x" :size="12"></icon> Bajas</div>
        <div class="val neg">{{ app.bajasPeriodo }}</div>
      </div>
    </div>

    <div class="card" style="margin-top:.8rem">
      <div class="card-title"><icon name="chart" :size="18" color="#D97706"></icon> Ventas últimos 7 días</div>
      <div class="chart-wrap"><canvas id="chartVentas"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title"><icon name="zap" :size="18" color="#D97706"></icon> Accesos rápidos</div>
      <div class="quick-grid">
        <button class="quick-btn" @click="app.ir('ventas')"><icon name="cart" :size="22"></icon>Nueva Venta</button>
        <button class="quick-btn" @click="app.ir('bajas')"><icon name="x" :size="22"></icon>Registrar Baja</button>
        <button class="quick-btn" @click="app.ir('compras')"><icon name="bag" :size="22"></icon>Compra Insumo</button>
        <button class="quick-btn" @click="app.ir('auditoria')"><icon name="check" :size="22"></icon>Auditoría</button>
      </div>
    </div>

    <div class="card" v-if="app.insumosBajoStock.length">
      <div class="card-title"><icon name="alert" :size="18" color="#D97706"></icon> Insumos bajo stock</div>
      <div v-for="i in app.insumosBajoStock" :key="i.id" class="item">
        <div class="info">
          <div class="nm">{{ i.nombre }}</div>
          <div class="det">Stock: {{ app.fmtCant(app.stockInsumo(i.id)) }} {{ i.unidad }} · Mín: {{ app.fmtCant(i.stockMinimo) }}</div>
        </div>
        <span class="badge low">BAJO</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SeccionDashboard',
  inject: ['$app'],
  computed: {
    app() { return this.$app; }
  },
  mounted() {
    this.$nextTick(() => this.renderChart());
  },
  methods: {
    async renderChart() {
      try {
        const cv = document.getElementById('chartVentas');
        if (!cv) return;
        if (this._chart) { try { this._chart.destroy(); } catch (e) {} }
        const { default: Chart } = await import('chart.js/auto');
        const dias = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          dias.push({ fecha: d.toISOString().split('T')[0], label: d.getDate() + '/' + (d.getMonth() + 1), v: 0 });
        }
        this.app.ventas.filter(v => !v.anulada).forEach(v => {
          const dia = v.fecha.split('T')[0];
          const d = dias.find(x => x.fecha === dia);
          if (d) d.v += Number(v.total) || 0;
        });
        const dark = this.app.cfg.tema === 'dark';
        const txt = dark ? '#9CA3AF' : '#6B7280';
        const grid = dark ? '#4B5563' : '#E5E7EB';
        this._chart = new Chart(cv.getContext('2d'), {
          type: 'bar',
          data: {
            labels: dias.map(d => d.label),
            datasets: [{ label: 'Ventas', data: dias.map(d => d.v), backgroundColor: '#D97706', borderRadius: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => ' ' + this.app.fmt(c.raw) } }
            },
            scales: {
              x: { ticks: { color: txt, font: { size: 10 } }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { color: txt, font: { size: 9 }, callback: v => '$' + v.toLocaleString() }, grid: { color: grid } }
            }
          }
        });
      } catch (e) { console.error('renderChart', e); }
    }
  },
  beforeUnmount() {
    if (this._chart) { try { this._chart.destroy(); } catch (e) {} }
  }
};
</script>
