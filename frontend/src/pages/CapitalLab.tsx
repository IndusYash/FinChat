import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, Home, Flame } from 'lucide-react';

export const CapitalLab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'POLICY' | 'SIP' | 'LOAN' | 'FIRE'>('POLICY');

  // 1. Policy vs Term + SIP State
  const [policyAnnualPremium, setPolicyAnnualPremium] = useState<number>(60000);
  const [policyTenure, setPolicyTenure] = useState<number>(20);
  const [policyMaturityPayout, setPolicyMaturityPayout] = useState<number>(2000000);
  const [termCost, setTermCost] = useState<number>(12000);
  const [equityReturnRate, setEquityReturnRate] = useState<number>(0.12);

  // Policy calculations
  const totalPolicyInvested = policyAnnualPremium * policyTenure;
  const annualInvestedInEquity = Math.max(0, policyAnnualPremium - termCost);
  let btiCorpus = 0;
  for (let t = 0; t < policyTenure; t++) {
    btiCorpus += annualInvestedInEquity * Math.pow(1 + equityReturnRate, policyTenure - t);
  }
  const wealthMultiplier = policyMaturityPayout > 0 ? (btiCorpus / policyMaturityPayout).toFixed(1) : '0';
  const extraWealth = Math.max(0, btiCorpus - policyMaturityPayout);

  // 2. SIP & Inflation State
  const [monthlySip, setMonthlySip] = useState<number>(15000);
  const [sipReturnRate, setSipReturnRate] = useState<number>(0.12);
  const [sipYears, setSipYears] = useState<number>(20);
  const [inflationRate, setInflationRate] = useState<number>(0.06);

  // SIP calculations
  const totalMonths = sipYears * 12;
  const monthlyR = Math.pow(1 + sipReturnRate, 1 / 12) - 1;
  let nominalFv = 0;
  for (let m = 0; m < totalMonths; m++) {
    nominalFv += monthlySip * Math.pow(1 + monthlyR, totalMonths - m);
  }
  const totalSipInvested = monthlySip * totalMonths;
  const realPurchasingPower = nominalFv / Math.pow(1 + inflationRate, sipYears);
  const inflationHaircutPct = nominalFv > 0 ? (((nominalFv - realPurchasingPower) / nominalFv) * 100).toFixed(0) : '0';

  // 3. Loan Prepayment Hack State
  const [loanPrincipal, setLoanPrincipal] = useState<number>(5000000);
  const [loanRate, setLoanRate] = useState<number>(0.085);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [extraEmiCount, setExtraEmiCount] = useState<number>(1);

  // Loan calculations
  const monthlyLoanR = loanRate / 12;
  const loanMonths = loanTenureYears * 12;
  const standardEmi =
    monthlyLoanR > 0
      ? (loanPrincipal * monthlyLoanR * Math.pow(1 + monthlyLoanR, loanMonths)) /
        (Math.pow(1 + monthlyLoanR, loanMonths) - 1)
      : loanPrincipal / loanMonths;
  const standardTotalPay = standardEmi * loanMonths;
  const standardTotalInterest = Math.max(0, standardTotalPay - loanPrincipal);

  // Prepayment loop
  let hackBalance = loanPrincipal;
  let hackMonths = 0;
  let hackTotalInterest = 0;
  while (hackBalance > 0 && hackMonths < loanMonths * 2) {
    hackMonths++;
    const intMonth = hackBalance * monthlyLoanR;
    hackTotalInterest += intMonth;
    let pay = standardEmi;
    if (extraEmiCount > 0 && hackMonths % 12 === 0) {
      pay += standardEmi * extraEmiCount;
    }
    const prin = pay - intMonth;
    if (prin >= hackBalance) {
      hackBalance = 0;
      break;
    } else {
      hackBalance -= prin;
    }
  }
  const newTenureYears = (hackMonths / 12).toFixed(1);
  const yearsSaved = Math.max(0, loanTenureYears - parseFloat(newTenureYears)).toFixed(1);
  const interestSaved = Math.max(0, standardTotalInterest - hackTotalInterest);

  // 4. FIRE Retirement State
  const [currentAge, setCurrentAge] = useState<number>(28);
  const [retireAge, setRetireAge] = useState<number>(45);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(50000);
  const [fireInflation] = useState<number>(0.06);
  const [currentSavings, setCurrentSavings] = useState<number>(1000000);
  const [monthlyFireInvest, setMonthlyFireInvest] = useState<number>(40000);

  // FIRE calculations
  const yearsToRetire = Math.max(1, retireAge - currentAge);
  const futureMonthlyExp = monthlyExpense * Math.pow(1 + fireInflation, yearsToRetire);
  const futureAnnualExp = futureMonthlyExp * 12;
  const fireTargetCorpus = futureAnnualExp * 25; // 25x rule (4% SWR)

  const fvSavings = currentSavings * Math.pow(1 + 0.12, yearsToRetire);
  let fvFireInvest = 0;
  const fireMonths = yearsToRetire * 12;
  const fireMonthlyR = Math.pow(1 + 0.12, 1 / 12) - 1;
  for (let m = 0; m < fireMonths; m++) {
    fvFireInvest += monthlyFireInvest * Math.pow(1 + fireMonthlyR, fireMonths - m);
  }
  const projectedCorpus = fvSavings + fvFireInvest;
  const isFireReady = projectedCorpus >= fireTargetCorpus;

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Title Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #000000',
          paddingBottom: '10px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em' }}>
            CAPITAL LAB — WEALTH & TRUTH SIMULATOR
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            Direct numeric inputs for unconstrained capital amounts + synced sliders for percentages and tenures
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div style={{ display: 'flex', border: '1px solid #000000' }}>
          {[
            { key: 'POLICY', label: '🛡️ POLICY TRUTH' },
            { key: 'SIP', label: '📈 SIP & INFLATION' },
            { key: 'LOAN', label: '🏡 LOAN HACK' },
            { key: 'FIRE', label: '🏖️ FIRE RETIREMENT' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className="mono"
              style={{
                backgroundColor: activeSubTab === tab.key ? '#000000' : '#FFFFFF',
                color: activeSubTab === tab.key ? '#FFFFFF' : '#000000',
                border: 'none',
                borderRight: '1px solid #000000',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. POLICY TRUTH SIMULATOR */}
      {activeSubTab === 'POLICY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
          <div style={{ border: '1px solid #E5E7EB', padding: '18px 20px', backgroundColor: '#FFFFFF' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              TRADITIONAL POLICY vs BTIR INPUTS
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              Type any custom amount directly. Sliders adjust standard rate and tenure ranges.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Annual Premium */}
              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Annual Policy Premium (₹)
                </label>
                <input
                  type="number"
                  value={policyAnnualPremium || ''}
                  onChange={(e) => setPolicyAnnualPremium(parseFloat(e.target.value) || 0)}
                  placeholder="Enter annual premium..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Policy Tenure */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Policy Tenure</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{policyTenure} Years</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={policyTenure}
                  onChange={(e) => setPolicyTenure(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>

              {/* Maturity Payout */}
              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Guaranteed Maturity Payout Promised (₹)
                </label>
                <input
                  type="number"
                  value={policyMaturityPayout || ''}
                  onChange={(e) => setPolicyMaturityPayout(parseFloat(e.target.value) || 0)}
                  placeholder="Enter maturity payout..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Term Insurance Cost */}
              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Pure Term Insurance Cost / Year (₹)
                </label>
                <input
                  type="number"
                  value={termCost || ''}
                  onChange={(e) => setTermCost(parseFloat(e.target.value) || 0)}
                  placeholder="Enter term plan annual cost..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Equity Return Rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Equity Index Expected Return (CAGR)</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{(equityReturnRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.06"
                  max="0.18"
                  step="0.005"
                  value={equityReturnRate}
                  onChange={(e) => setEquityReturnRate(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>
            </div>
          </div>

          {/* Results Side by Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid #E5E7EB', padding: '16px', backgroundColor: '#FEF2F2' }}>
                <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', marginBottom: '4px' }}>
                  OPTION A: TRADITIONAL POLICY
                </div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#000000', marginBottom: '4px' }}>
                  ₹{(policyMaturityPayout / 100000).toFixed(2)} Lakhs
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
                  Total Paid: ₹{(totalPolicyInvested / 100000).toFixed(2)} Lakhs
                </div>
                <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                  Real Internal Rate of Return (IRR): ~4.8%
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                  ⚠️ Barely matches inflation. Inadequate life cover (typically ₹{((policyAnnualPremium * 10) / 100000).toFixed(1)}L).
                </div>
              </div>

              <div style={{ border: '2px solid #10B981', padding: '16px', backgroundColor: '#ECFDF5' }}>
                <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                  OPTION B: BUY TERM & INVEST REST (BTIR)
                </div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                  ₹{(btiCorpus / 100000).toFixed(2)} Lakhs
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>
                  Invested: ₹{(annualInvestedInEquity / 100000).toFixed(2)}L/yr in Index Fund + ₹1 Cr Term Plan
                </div>
                <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                  Wealth Multiplier: {wealthMultiplier}x MORE WEALTH
                </div>
                <div style={{ fontSize: '10px', color: '#065F46', marginTop: '4px', fontWeight: 600 }}>
                  ✓ Extra Wealth: +₹{(extraWealth / 100000).toFixed(2)} Lakhs + Massive Life Cover!
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FAFAFA' }}>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={15} color="#DC2626" />
                <span>THE FINANCIAL TRUTH VERDICT:</span>
              </div>
              <p style={{ fontSize: '12px', color: '#1F2937', lineHeight: 1.5 }}>
                Traditional endowment policies offer low returns (~4.5%–5%) and lock your capital.
                By taking a dedicated term plan (₹{termCost.toLocaleString()}/yr) and putting the remaining ₹{annualInvestedInEquity.toLocaleString()}/yr in an equity index fund at {(equityReturnRate * 100).toFixed(0)}%, you generate <strong>₹{(extraWealth / 100000).toFixed(2)} Lakhs more wealth</strong> ({wealthMultiplier}x).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIP & INFLATION REALITY CHECK */}
      {activeSubTab === 'SIP' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
          <div style={{ border: '1px solid #E5E7EB', padding: '18px 20px', backgroundColor: '#FFFFFF' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              SIP & INFLATION PARAMETERS
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              Type any monthly SIP amount directly without slider limits.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Monthly SIP */}
              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Monthly SIP Amount (₹)
                </label>
                <input
                  type="number"
                  value={monthlySip || ''}
                  onChange={(e) => setMonthlySip(parseFloat(e.target.value) || 0)}
                  placeholder="Enter monthly SIP amount..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Tenure Years */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Investment Horizon</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{sipYears} Years</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="45"
                  step="1"
                  value={sipYears}
                  onChange={(e) => setSipYears(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>

              {/* Expected Return */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Expected Annual Return (CAGR)</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{(sipReturnRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.06"
                  max="0.20"
                  step="0.005"
                  value={sipReturnRate}
                  onChange={(e) => setSipReturnRate(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>

              {/* Inflation Rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Annual Inflation Rate</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{(inflationRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.03"
                  max="0.12"
                  step="0.005"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>
            </div>
          </div>

          {/* Results Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                border: '1px solid #E5E7EB',
                padding: '14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>TOTAL INVESTED</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700 }}>₹{(totalSipInvested / 100000).toFixed(2)}L</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>NOMINAL CORPUS</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#3B82F6' }}>
                  ₹{(nominalFv / 100000).toFixed(2)}L
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280' }}>REAL PURCHASING POWER</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
                  ₹{(realPurchasingPower / 100000).toFixed(2)}L
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FAFAFA' }}>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} color="#10B981" />
                <span>THE INFLATION REALITY CHECK:</span>
              </div>
              <p style={{ fontSize: '12px', color: '#1F2937', lineHeight: 1.5, marginBottom: '10px' }}>
                Your projected corpus of <strong>₹{(nominalFv / 100000).toFixed(2)} Lakhs</strong> in {sipYears} years will feel huge on paper, but due to a {(inflationRate * 100).toFixed(0)}% annual inflation rate, it has suffered a <strong>{inflationHaircutPct}% purchasing power haircut</strong>.
              </p>
              <div className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#000000', backgroundColor: '#F3F4F6', padding: '8px 12px' }}>
                💡 In today's money, you will only have the purchasing power of ₹{(realPurchasingPower / 100000).toFixed(2)} Lakhs.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOAN PREPAYMENT HACK */}
      {activeSubTab === 'LOAN' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
          <div style={{ border: '1px solid #E5E7EB', padding: '18px 20px', backgroundColor: '#FFFFFF' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              LOAN & PREPAYMENT HACK INPUTS
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              Type any loan amount directly (₹10 Lakhs, ₹1 Crore, ₹10 Crores, etc.).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Loan Amount */}
              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Total Loan Principal (₹)
                </label>
                <input
                  type="number"
                  value={loanPrincipal || ''}
                  onChange={(e) => setLoanPrincipal(parseFloat(e.target.value) || 0)}
                  placeholder="Enter loan principal..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Interest Rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Annual Interest Rate</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{(loanRate * 100).toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.18"
                  step="0.0025"
                  value={loanRate}
                  onChange={(e) => setLoanRate(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>

              {/* Tenure Years */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Original Loan Tenure</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{loanTenureYears} Years</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={loanTenureYears}
                  onChange={(e) => setLoanTenureYears(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>

              {/* Extra EMIs per year */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>Prepayment Hack: Extra EMIs Per Year</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{extraEmiCount} Extra EMI / Year</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={extraEmiCount}
                  onChange={(e) => setExtraEmiCount(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#000000' }}
                />
              </div>
            </div>
          </div>

          {/* Results Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid #E5E7EB', padding: '16px', backgroundColor: '#FFFFFF' }}>
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>MONTHLY EMI</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>₹{standardEmi.toFixed(0)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                  Original Total Interest: ₹{(standardTotalInterest / 100000).toFixed(2)} Lakhs
                </div>
              </div>

              <div style={{ border: '2px solid #10B981', padding: '16px', backgroundColor: '#ECFDF5' }}>
                <div className="mono" style={{ fontSize: '10px', color: '#065F46', marginBottom: '4px' }}>WITH PREPAYMENT HACK</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#065F46' }}>
                  {newTenureYears} Years ({yearsSaved} Yrs Saved!)
                </div>
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
                  Interest Saved: ₹{(interestSaved / 100000).toFixed(2)} Lakhs
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FAFAFA' }}>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Home size={15} color="#10B981" />
                <span>THE PREPAYMENT HACK INSIGHT:</span>
              </div>
              <p style={{ fontSize: '12px', color: '#1F2937', lineHeight: 1.5 }}>
                In a standard {loanTenureYears}-year loan, you pay <strong>₹{(standardTotalInterest / 100000).toFixed(2)} Lakhs just in interest</strong>.
                By paying just <strong>{extraEmiCount} extra EMI every year</strong>, you slash the loan down to <strong>{newTenureYears} years</strong> and save <strong>₹{(interestSaved / 100000).toFixed(2)} Lakhs</strong> in pure interest.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. FIRE RETIREMENT SIMULATOR */}
      {activeSubTab === 'FIRE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
          <div style={{ border: '1px solid #E5E7EB', padding: '18px 20px', backgroundColor: '#FFFFFF' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              FIRE PARAMETERS
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
              Directly type your current expenses, monthly investment, and existing savings.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div className="mono" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Current Age: {currentAge}</div>
                  <input
                    type="range"
                    min="18"
                    max="55"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#000000' }}
                  />
                </div>
                <div>
                  <div className="mono" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Target Age: {retireAge}</div>
                  <input
                    type="range"
                    min="30"
                    max="70"
                    value={retireAge}
                    onChange={(e) => setRetireAge(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#000000' }}
                  />
                </div>
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Current Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  value={monthlyExpense || ''}
                  onChange={(e) => setMonthlyExpense(parseFloat(e.target.value) || 0)}
                  placeholder="Enter monthly expenses..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Monthly Investment Towards FIRE (₹)
                </label>
                <input
                  type="number"
                  value={monthlyFireInvest || ''}
                  onChange={(e) => setMonthlyFireInvest(parseFloat(e.target.value) || 0)}
                  placeholder="Enter monthly investment..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label className="mono" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Current Liquid Savings / Net Worth (₹)
                </label>
                <input
                  type="number"
                  value={currentSavings || ''}
                  onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)}
                  placeholder="Enter current net worth..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #000000',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid #E5E7EB', padding: '16px', backgroundColor: '#FFFFFF' }}>
                <div className="mono" style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>FIRE TARGET CORPUS (25x)</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>₹{(fireTargetCorpus / 10000000).toFixed(2)} Cr</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                  Future expenses at {retireAge}: ₹{(futureMonthlyExp / 1000).toFixed(0)}K/mo
                </div>
              </div>

              <div
                style={{
                  border: isFireReady ? '2px solid #10B981' : '2px solid #EF4444',
                  padding: '16px',
                  backgroundColor: isFireReady ? '#ECFDF5' : '#FEF2F2',
                }}
              >
                <div className="mono" style={{ fontSize: '10px', color: isFireReady ? '#065F46' : '#991B1B', marginBottom: '4px' }}>
                  PROJECTED CORPUS AT AGE {retireAge}
                </div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: isFireReady ? '#065F46' : '#991B1B' }}>
                  ₹{(projectedCorpus / 10000000).toFixed(2)} Cr
                </div>
                <div className="mono" style={{ fontSize: '11px', marginTop: '6px', fontWeight: 700, color: isFireReady ? '#059669' : '#DC2626' }}>
                  {isFireReady ? '✓ FINANCIAL FREEDOM ACHIEVABLE' : '⚠️ SHORTFALL DETECTED'}
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #000000', padding: '16px', backgroundColor: '#FAFAFA' }}>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={15} color="#F59E0B" />
                <span>THE FIRE BLUEPRINT:</span>
              </div>
              <p style={{ fontSize: '12px', color: '#1F2937', lineHeight: 1.5 }}>
                {isFireReady ? (
                  <>You are in the green! Based on the 4% Safe Withdrawal Rate (25x annual expenses), you will accumulate <strong>₹{(projectedCorpus / 10000000).toFixed(2)} Crores</strong> by age {retireAge}, safely funding your lifestyle indefinitely without touching principal.</>
                ) : (
                  <>At your current pace, there is a shortfall of <strong>₹{((fireTargetCorpus - projectedCorpus) / 10000000).toFixed(2)} Crores</strong>. To hit FIRE by age {retireAge}, either boost monthly savings or adjust the target retirement age by 2–3 years.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
