import math
from typing import Any, Dict, List, Tuple


class CapitalEngine:
    """Pure-Python personal finance & wealth simulation engine.
    Implements deterministic compound interest, loan amortization prepayment hacks,
    real inflation purchasing power haircuts, and insurance policy IRR comparisons.
    """

    @staticmethod
    def calculate_policy_vs_term_sip(
        annual_premium: float = 60000.0,
        tenure_years: int = 20,
        maturity_payout: float = 2000000.0,
        term_insurance_cost: float = 12000.0,
        equity_return_rate: float = 0.12,
    ) -> Dict[str, Any]:
        """Calculates traditional endowment/money-back insurance policy vs
        Buy Term and Invest the Rest (BTIR) in an equity index fund.
        """
        # Option A: Traditional Policy IRR (Internal Rate of Return)
        # Solve for r: maturity_payout = annual_premium * sum((1+r)^t)
        total_invested_policy = annual_premium * tenure_years

        # Bisection method to find exact IRR
        low_r = 0.001
        high_r = 0.25
        for _ in range(60):
            mid_r = (low_r + high_r) / 2.0
            fv = sum(annual_premium * ((1.0 + mid_r) ** (tenure_years - t)) for t in range(tenure_years))
            if fv < maturity_payout:
                low_r = mid_r
            else:
                high_r = mid_r
        policy_irr = round(mid_r * 100, 2)

        # Option B: Buy Term & Invest the Rest (BTIR)
        annual_investment_amount = max(0.0, annual_premium - term_insurance_cost)
        btir_corpus = sum(
            annual_investment_amount * ((1.0 + equity_return_rate) ** (tenure_years - t))
            for t in range(tenure_years)
        )

        wealth_multiplier = round(btir_corpus / maturity_payout, 2) if maturity_payout > 0 else 0.0
        extra_wealth_generated = round(btir_corpus - maturity_payout, 2)

        return {
            "policy_annual_premium": annual_premium,
            "tenure_years": tenure_years,
            "total_invested": total_invested_policy,
            "policy_maturity_payout": maturity_payout,
            "policy_real_irr_percent": policy_irr,
            "term_insurance_cost": term_insurance_cost,
            "annual_invested_in_equity": annual_investment_amount,
            "assumed_equity_return_percent": equity_return_rate * 100,
            "btir_final_corpus": round(btir_corpus, 2),
            "wealth_multiplier": wealth_multiplier,
            "extra_wealth_generated": extra_wealth_generated,
            "verdict": (
                f"Option B generates {wealth_multiplier}x more wealth "
                f"(+${extra_wealth_generated:,.0f} extra) PLUS gives higher life cover."
            ),
        }

    @staticmethod
    def calculate_sip_with_inflation(
        monthly_investment: float = 15000.0,
        expected_annual_return: float = 0.12,
        tenure_years: int = 20,
        annual_inflation_rate: float = 0.06,
        annual_step_up_percent: float = 0.0,
    ) -> Dict[str, Any]:
        """Calculates wealth accumulation via SIP, applying an inflation reality check
        to show nominal future value vs real purchasing power in today's dollars.
        """
        months = tenure_years * 12
        monthly_r = (1.0 + expected_annual_return) ** (1.0 / 12.0) - 1.0

        total_invested = 0.0
        nominal_future_value = 0.0
        current_monthly = monthly_investment

        for m in range(months):
            if annual_step_up_percent > 0 and m > 0 and m % 12 == 0:
                current_monthly *= (1.0 + annual_step_up_percent / 100.0)

            total_invested += current_monthly
            # Compounding to end of tenure
            months_remaining = months - m
            nominal_future_value += current_monthly * ((1.0 + monthly_r) ** months_remaining)

        # Real Purchasing Power adjusted for inflation: PV = FV / (1 + i)^n
        real_purchasing_power = nominal_future_value / ((1.0 + annual_inflation_rate) ** tenure_years)
        inflation_loss_percent = round((1.0 - (real_purchasing_power / nominal_future_value)) * 100, 1)

        return {
            "monthly_investment": monthly_investment,
            "tenure_years": tenure_years,
            "annual_return_percent": expected_annual_return * 100,
            "inflation_rate_percent": annual_inflation_rate * 100,
            "total_invested": round(total_invested, 2),
            "nominal_future_value": round(nominal_future_value, 2),
            "real_purchasing_power": round(real_purchasing_power, 2),
            "inflation_loss_percent": inflation_loss_percent,
            "wealth_gain_nominal": round(nominal_future_value - total_invested, 2),
            "wealth_gain_real": round(real_purchasing_power - total_invested, 2),
        }

    @staticmethod
    def calculate_loan_prepayment_hack(
        loan_amount: float = 5000000.0,
        annual_interest_rate: float = 0.085,
        tenure_years: int = 20,
        extra_emi_per_year: int = 1,
    ) -> Dict[str, Any]:
        """Simulates home/personal loan repayment comparing standard amortization
        vs the 'Prepayment Hack' (paying 1 extra EMI each year).
        """
        monthly_r = annual_interest_rate / 12.0
        n_months = tenure_years * 12

        # Standard Monthly EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        standard_emi = (
            loan_amount * monthly_r * ((1.0 + monthly_r) ** n_months)
        ) / (((1.0 + monthly_r) ** n_months) - 1.0)

        total_standard_payment = standard_emi * n_months
        total_standard_interest = total_standard_payment - loan_amount

        # Simulating with Prepayment Hack
        balance = loan_amount
        actual_months = 0
        total_hack_paid = 0.0
        total_hack_interest = 0.0

        while balance > 0 and actual_months < n_months * 2:
            actual_months += 1
            interest_month = balance * monthly_r
            total_hack_interest += interest_month

            payment_this_month = standard_emi
            # Add extra payment once a year (month 12, 24, 36...)
            if extra_emi_per_year > 0 and actual_months % 12 == 0:
                payment_this_month += (standard_emi * extra_emi_per_year)

            principal_paid = payment_this_month - interest_month
            if principal_paid >= balance:
                total_hack_paid += (balance + interest_month)
                balance = 0.0
                break
            else:
                balance -= principal_paid
                total_hack_paid += payment_this_month

        new_tenure_years = round(actual_months / 12.0, 1)
        years_saved = round(tenure_years - new_tenure_years, 1)
        interest_saved = round(total_standard_interest - total_hack_interest, 2)
        interest_saved_percent = round((interest_saved / total_standard_interest) * 100, 1)

        return {
            "loan_amount": loan_amount,
            "annual_interest_rate_percent": annual_interest_rate * 100,
            "original_tenure_years": tenure_years,
            "monthly_emi": round(standard_emi, 2),
            "standard_total_interest": round(total_standard_interest, 2),
            "standard_total_payment": round(total_standard_payment, 2),
            "hack_new_tenure_years": new_tenure_years,
            "years_saved": years_saved,
            "interest_saved": interest_saved,
            "interest_saved_percent": interest_saved_percent,
            "hack_total_payment": round(total_hack_paid, 2),
            "verdict": (
                f"Paying {extra_emi_per_year} extra EMI/yr cuts loan from {tenure_years} yrs to {new_tenure_years} yrs "
                f"and saves ${interest_saved:,.0f} ({interest_saved_percent}%) in interest!"
            ),
        }

    @staticmethod
    def calculate_fire_retirement(
        current_age: int = 28,
        retirement_age: int = 45,
        current_monthly_expenses: float = 50000.0,
        inflation_rate: float = 0.06,
        current_savings: float = 1000000.0,
        monthly_investment: float = 40000.0,
        expected_investment_return: float = 0.12,
        safe_withdrawal_rate: float = 0.04,  # 4% Rule = 25x annual expenses
    ) -> Dict[str, Any]:
        """Calculates Financial Independence, Retire Early (FIRE) metrics:
        Target corpus based on the 25x/30x rule and projected accumulation.
        """
        years_to_fire = max(1, retirement_age - current_age)
        months_to_fire = years_to_fire * 12

        # Future Monthly Expenses at retirement age
        future_monthly_expenses = current_monthly_expenses * ((1.0 + inflation_rate) ** years_to_fire)
        future_annual_expenses = future_monthly_expenses * 12.0

        # Target FIRE Corpus needed: Annual Expenses / SWR (e.g. 25x)
        fire_target_corpus = future_annual_expenses / safe_withdrawal_rate

        # Projected wealth accumulation
        monthly_r = (1.0 + expected_investment_return) ** (1.0 / 12.0) - 1.0
        # Future value of current savings
        fv_current = current_savings * ((1.0 + expected_investment_return) ** years_to_fire)
        # Future value of monthly contributions
        fv_contributions = 0.0
        for m in range(months_to_fire):
            fv_contributions += monthly_investment * ((1.0 + monthly_r) ** (months_to_fire - m))

        projected_corpus = fv_current + fv_contributions
        surplus_or_shortfall = projected_corpus - fire_target_corpus
        is_fire_achievable = projected_corpus >= fire_target_corpus

        return {
            "current_age": current_age,
            "retirement_age": retirement_age,
            "years_to_retirement": years_to_fire,
            "current_annual_expenses": current_monthly_expenses * 12.0,
            "future_annual_expenses": round(future_annual_expenses, 2),
            "fire_target_corpus": round(fire_target_corpus, 2),
            "projected_retirement_corpus": round(projected_corpus, 2),
            "surplus_or_shortfall": round(surplus_or_shortfall, 2),
            "is_fire_achievable": is_fire_achievable,
            "verdict": (
                "FIRE Achievable! You are on track for a surplus."
                if is_fire_achievable
                else f"Shortfall of ${abs(surplus_or_shortfall):,.0f}. Increase monthly investment or extend retirement age."
            ),
        }
