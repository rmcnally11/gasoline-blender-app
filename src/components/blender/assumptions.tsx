export function Assumptions() {
  return (
    <div className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
      <div>
        <h3 className="mb-1 font-medium text-foreground">What this first slice is</h3>
        <p>
          A single-grade gasoline blend header: pick a finished spec, price the blendstocks,
          and solve a linear program for the cheapest recipe that stays on spec. Use it to
          learn the tradeoffs before adding tanks, multi-grade allocation, or a plant-wide LP.
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Blend rules</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Octane, benzene, aromatics, and olefins blend volume-linear on blending numbers.</li>
          <li>RVP uses the Chevron index BI = RVP<sup>1.25</sup>, which keeps the LP linear.</li>
          <li>Sulfur and oxygen are mass-weighted with specific gravity.</li>
          <li>Ethanol RVP of 18 psi is a splash-blend approximation of the E10 vapor-pressure bump.</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Spec simplifications</h3>
        <p>
          Regular / midgrade / premium set (R+M)/2. Seasonal RVP classes follow ASTM D4814
          volatility. Sulfur is Tier 3 at 10 ppm. Benzene uses the 0.62 vol% MSAT2 average,
          not the 1.3 cap. Aromatics and olefins are internal limits, not federal maxima.
          The 1-psi waiver adds 1.0 psi to the RVP limit when enabled.
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Intentionally later</h3>
        <p>
          Distillation (T50 / T90 / E200), driveability index, tank heels, component
          availability in barrels, simultaneous regular/premium, RFG / RBOB vs CBOB,
          nonlinear octane interaction, and a live price feed. Those are the next model
          layers once this header is useful.
        </p>
      </div>
    </div>
  );
}
