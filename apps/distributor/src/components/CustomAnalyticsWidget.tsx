import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList, Treemap
} from 'recharts';
import {
  BarChart3, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon,
  Filter, Calendar, Download, Sparkles, GitCompare, Lightbulb, Check,
  Grid, Target, Activity
} from 'lucide-react';

type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'radar' | 'scatter' | 'funnel' | 'treemap' | 'waterfall';
type TimeFrame = 'today' | 'week' | 'month' | 'year';
type MetricType = 'top_products' | 'product_comparison' | 'category_comparison' | 'monthly_revenue' | 'margin_profitability' | 'stock_rotation' | 'sales_by_city' | 'order_funnel' | 'price_vs_volume';

const COLORS = ['#4f7cff', '#7c3aed', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899', '#8b5cf6'];

const ALL_PRODUCTS = [
  'Sucettes Chupa Chups',
  'Chocolat Milka',
  'Biscuits Oreo',
  'Jus Rouiba 1L',
  'Eau Lalla Khedidja',
  'Chewing-gum Trident'
];

// Comprehensive Catalog of BI Datasets
const DATASETS: Record<MetricType, { title: string; unit: string; insight: string; data: any[] }> = {
  top_products: {
    title: 'Top Produits les plus vendus (Histogramme / Treemap)',
    unit: 'boîtes',
    insight: '🏆 Sucettes Chupa Chups reste le produit n°1 avec 450 boîtes vendues ce mois-ci.',
    data: [
      { name: 'Sucettes Chupa', value: 450, total: 54000 },
      { name: 'Chocolat Milka', value: 380, total: 76000 },
      { name: 'Biscuits Oreo', value: 310, total: 46500 },
      { name: 'Jus Rouiba 1L', value: 290, total: 34800 },
      { name: 'Eau Lalla Khedidja', value: 240, total: 19200 },
      { name: 'Chewing-gum Trident', value: 180, total: 14400 },
    ]
  },
  product_comparison: {
    title: 'Comparatif Produit vs Produit (Courbes / Barres Groupées)',
    unit: 'boîtes',
    insight: '📈 Chocolat Milka connaît la plus forte croissance (+28% vs mois dernier), réduisant l\'écart avec Chupa Chups.',
    data: [
      { name: 'Jan', 'Sucettes Chupa Chups': 320, 'Chocolat Milka': 210, 'Biscuits Oreo': 180 },
      { name: 'Fév', 'Sucettes Chupa Chups': 350, 'Chocolat Milka': 240, 'Biscuits Oreo': 200 },
      { name: 'Mar', 'Sucettes Chupa Chups': 390, 'Chocolat Milka': 290, 'Biscuits Oreo': 230 },
      { name: 'Avr', 'Sucettes Chupa Chups': 410, 'Chocolat Milka': 330, 'Biscuits Oreo': 270 },
      { name: 'Mai', 'Sucettes Chupa Chups': 450, 'Chocolat Milka': 380, 'Biscuits Oreo': 310 },
    ]
  },
  category_comparison: {
    title: 'Comparatif par Catégories (Donut / Pie / Treemap)',
    unit: 'DA',
    insight: '📊 La catégorie Candy & Confiserie génère 42% du Chiffre d\'Affaires global de votre entrepôt.',
    data: [
      { name: 'Candy & Confiserie', value: 1250000, size: 400 },
      { name: 'Biscuits & Gâteaux', value: 890000, size: 300 },
      { name: 'Boissons & Jus', value: 720000, size: 200 },
      { name: 'Chocolats', value: 540000, size: 150 },
      { name: 'Divers', value: 210000, size: 80 },
    ]
  },
  monthly_revenue: {
    title: 'Revenus Mensuels (Waterfall / Courbes superposées)',
    unit: 'DA',
    insight: '🚀 Vos revenus d\'août ont augmenté de +23,4% par rapport au même mois l\'année dernière.',
    data: [
      { name: 'Jan', value: 420000, previous: 380000 },
      { name: 'Fév', value: 490000, previous: 410000 },
      { name: 'Mar', value: 550000, previous: 460000 },
      { name: 'Avr', value: 510000, previous: 490000 },
      { name: 'Mai', value: 620000, previous: 530000 },
      { name: 'Juin', value: 710000, previous: 580000 },
      { name: 'Juil', value: 680000, previous: 610000 },
      { name: 'Août', value: 790000, previous: 640000 },
    ]
  },
  margin_profitability: {
    title: 'Marge & Rentabilité par Produit (%)',
    unit: '% Marge',
    insight: '💰 Chewing-gum Trident et Chocolat Milka offrent les meilleures marges brutes unitaire (>28%).',
    data: [
      { name: 'Sucettes Chupa', value: 22 },
      { name: 'Chocolat Milka', value: 28 },
      { name: 'Biscuits Oreo', value: 25 },
      { name: 'Jus Rouiba 1L', value: 18 },
      { name: 'Eau Lalla Khedidja', value: 15 },
      { name: 'Chewing-gum Trident', value: 30 },
    ]
  },
  stock_rotation: {
    title: 'Vitesse de Rotation de Stock (Jours d\'écoulement)',
    unit: 'Jours',
    insight: '⚡ Eau Lalla Khedidja s\'écoule en moins de 3 jours. Réapprovisionnement urgent requis !',
    data: [
      { name: 'Sucettes Chupa', value: 4 },
      { name: 'Chocolat Milka', value: 7 },
      { name: 'Biscuits Oreo', value: 9 },
      { name: 'Jus Rouiba 1L', value: 6 },
      { name: 'Eau Lalla Khedidja', value: 3 },
      { name: 'Chewing-gum Trident', value: 14 },
    ]
  },
  sales_by_city: {
    title: 'Ventes par Secteur / Wilaya',
    unit: 'commandes',
    insight: '📍 Alger Centre représente 35% de vos commandes totales distribuées.',
    data: [
      { name: 'Alger Centre', value: 142 },
      { name: 'Blida', value: 98 },
      { name: 'Boumerdès', value: 76 },
      { name: 'Tipaza', value: 54 },
      { name: 'Médéa', value: 38 },
    ]
  },
  order_funnel: {
    title: 'Entonnoir de Conversion des Commandes (Funnel Chart)',
    unit: 'commandes',
    insight: '🎯 84% des commandes passées par les détaillants sont livrées en moins de 24h.',
    data: [
      { name: 'Commandes Reçues', value: 500, fill: '#4f7cff' },
      { name: 'Validées & En Stock', value: 460, fill: '#7c3aed' },
      { name: 'En Préparation Entrepôt', value: 440, fill: '#06b6d4' },
      { name: 'En Cours de Livraison', value: 420, fill: '#f59e0b' },
      { name: 'Livrées & Encaissées', value: 418, fill: '#22c55e' },
    ]
  },
  price_vs_volume: {
    title: 'Analyse Sensibilité Prix vs Volume (Scatter Plot)',
    unit: 'vol/prix',
    insight: '🔍 Les produits dont le prix est inférieur à 1 500 DA tournent 3x plus vite.',
    data: [
      { x: 1200, y: 450, z: 200, name: 'Chupa Chups' },
      { x: 2000, y: 380, z: 240, name: 'Milka' },
      { x: 1500, y: 310, z: 180, name: 'Oreo' },
      { x: 1200, y: 290, z: 150, name: 'Rouiba 1L' },
      { x: 800, y: 240, z: 120, name: 'Lalla Khedidja' },
      { x: 800, y: 180, z: 90, name: 'Trident' },
    ]
  }
};

const RADAR_MOCK = [
  { subject: 'Volume Ventes', A: 90, B: 65, fullMark: 100 },
  { subject: 'Marge %', A: 60, B: 85, fullMark: 100 },
  { subject: 'Vitesse Stock', A: 95, B: 70, fullMark: 100 },
  { subject: 'Fidélité Re-achat', A: 85, B: 90, fullMark: 100 },
  { subject: 'Faible Taux Retour', A: 90, B: 80, fullMark: 100 },
];

export default function CustomAnalyticsWidget() {
  const [metric, setMetric] = useState<MetricType>('product_comparison');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeframe, setTimeframe] = useState<TimeFrame>('month');

  // Selected products for comparative mode
  const [selectedProducts, setSelectedProducts] = useState<string[]>([
    'Sucettes Chupa Chups',
    'Chocolat Milka',
    'Biscuits Oreo'
  ]);

  const toggleProductSelection = (p: string) => {
    setSelectedProducts(prev =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]
    );
  };

  const currentDataset = DATASETS[metric];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="card" style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <Sparkles size={14} /> Centre d'Analyse BI Exhaustif & Sur Mesure
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
            Générateur de Graphiques & Visualisation de Données
          </h3>
        </div>

        <button className="btn btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Exporter Rapport
        </button>
      </div>

      {/* Control Bar: Metric, Chart Type, Timeframe */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14,
        padding: 16, background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20
      }}>
        {/* Select Metric */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Filter size={12} /> INDICATEUR / METRIQUE
          </label>
          <select
            value={metric}
            onChange={(e) => {
              const val = e.target.value as MetricType;
              setMetric(val);
              if (val === 'product_comparison') setChartType('line');
              if (val === 'order_funnel') setChartType('funnel');
              if (val === 'price_vs_volume') setChartType('scatter');
            }}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)',
              border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none'
            }}
          >
            <option value="product_comparison">⚔️ Comparatif Produit vs Produit</option>
            <option value="top_products">🏆 Top Produits les plus vendus</option>
            <option value="category_comparison">🏷️ Comparatif par Catégories</option>
            <option value="monthly_revenue">💰 Revenus Mensuels (Comparatif)</option>
            <option value="margin_profitability">📈 Marge & Rentabilité par Produit (%)</option>
            <option value="stock_rotation">⚡ Vitesse de Rotation de Stock (Jours)</option>
            <option value="sales_by_city">📍 Ventes par Secteur / Wilaya</option>
            <option value="order_funnel">🎯 Entonnoir de Conversion Commandes</option>
            <option value="price_vs_volume">🔍 Sensibilité Prix vs Volume</option>
          </select>
        </div>

        {/* Select Chart Type (All 10 available charts!) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            📊 FORME DU GRAPHIQUE ({10} TYPES)
          </label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { type: 'line', icon: LineIcon, title: 'Courbe Linéaire' },
              { type: 'bar', icon: BarChart3, title: 'Histogramme' },
              { type: 'area', icon: AreaIcon, title: 'Graphique d\'Aire' },
              { type: 'pie', icon: PieIcon, title: 'Diagramme Circulaire' },
              { type: 'donut', icon: Target, title: 'Diagramme Anneau (Donut)' },
              { type: 'radar', icon: GitCompare, title: 'Radar Multi-critères' },
              { type: 'treemap', icon: Grid, title: 'Treemap (Rectangles)' },
              { type: 'funnel', icon: Filter, title: 'Entonnoir (Funnel)' },
              { type: 'scatter', icon: Activity, title: 'Nuage de Points' },
            ].map((c) => (
              <button
                key={c.type}
                type="button"
                title={c.title}
                onClick={() => setChartType(c.type as ChartType)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid',
                  borderColor: chartType === c.type ? 'var(--accent)' : 'var(--border)',
                  background: chartType === c.type ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: chartType === c.type ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <c.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Select Timeframe */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Calendar size={12} /> PÉRIODE TEMPORELLE
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeFrame)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)',
              border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none'
            }}
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois-ci</option>
            <option value="year">Année en cours</option>
          </select>
        </div>
      </div>

      {/* Multi-Product Selector (Visible in Product Comparison Mode) */}
      {metric === 'product_comparison' && (
        <div style={{
          padding: 14, background: 'var(--bg-primary)', borderRadius: 10,
          border: '1px solid var(--border)', marginBottom: 20
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitCompare size={12} style={{ color: 'var(--accent)' }} /> Sélectionner les produits à comparer côte à côte :
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_PRODUCTS.map((p, idx) => {
              const isSelected = selectedProducts.includes(p);
              const color = COLORS[idx % COLORS.length];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProductSelection(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                    borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: isSelected ? `${color}20` : 'var(--bg-card)',
                    color: isSelected ? color : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && <Check size={12} />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Trend Insight Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: 10,
        border: '1px solid rgba(124, 58, 237, 0.25)', marginBottom: 24
      }}>
        <Lightbulb size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {currentDataset.insight}
        </div>
      </div>

      {/* Chart Canvas Component Selector */}
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'radar' ? (
            <RadarChart data={RADAR_MOCK}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} />
              <Radar name="Sucettes Chupa Chups" dataKey="A" stroke="#4f7cff" fill="#4f7cff" fillOpacity={0.4} />
              <Radar name="Chocolat Milka" dataKey="B" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          ) : chartType === 'funnel' ? (
            <FunnelChart>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Funnel data={DATASETS.order_funnel.data} dataKey="value" nameKey="name" isAnimationActive>
                <LabelList position="right" fill="var(--text-primary)" stroke="none" dataKey="name" fontSize={12} />
              </Funnel>
            </FunnelChart>
          ) : chartType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="x" name="Prix" unit=" DA" stroke="var(--text-muted)" fontSize={12} />
              <YAxis type="number" dataKey="y" name="Volume Vendu" unit=" pcs" stroke="var(--text-muted)" fontSize={12} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Scatter name="Produits" data={DATASETS.price_vs_volume.data} fill="var(--accent)" />
            </ScatterChart>
          ) : chartType === 'treemap' ? (
            <Treemap
              data={currentDataset.data}
              dataKey="value"
              stroke="var(--bg-primary)"
              fill="var(--accent)"
            >
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
            </Treemap>
          ) : metric === 'product_comparison' ? (
            chartType === 'bar' ? (
              <BarChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedProducts.map((p, idx) => (
                  <Bar key={p} dataKey={p} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            ) : chartType === 'area' ? (
              <AreaChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedProducts.map((p, idx) => (
                  <Area key={p} type="monotone" dataKey={p} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedProducts.map((p, idx) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />
                ))}
              </LineChart>
            )
          ) : chartType === 'bar' ? (
            <BarChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" name={currentDataset.unit} fill="var(--accent)" radius={[6, 6, 0, 0]}>
                {currentDataset.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="value" name="Valeur" stroke="var(--accent)" strokeWidth={3} dot={{ r: 5 }} />
              {currentDataset.data[0]?.previous !== undefined && (
                <Line type="monotone" dataKey="previous" name="Année précédente" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" />
              )}
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={currentDataset.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" fillOpacity={1} fill="url(#colorArea)" />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={currentDataset.data}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 65 : 0}
                outerRadius={105}
                paddingAngle={chartType === 'donut' ? 4 : 0}
                dataKey="value"
              >
                {currentDataset.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
