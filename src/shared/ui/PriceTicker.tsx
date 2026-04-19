import { useAppStore } from '@/shared/store/useAppStore';
import { useAssetPrices } from '@/shared/api/hooks';
import { ASSETS } from '@/shared/utils/assets';

function fmtPrice(price: number, id: string): string {
  // Forex pairs with price < 10 need 4 dp; large indices/crypto need 2
  if (price < 10) return price.toFixed(4);
  if (price < 100) return price.toFixed(3);
  return price.toFixed(2);
}

export function PriceTicker() {
  const twelveKey = useAppStore((s) => s.twelveKey);
  const { prices, isLoading } = useAssetPrices(twelveKey);

  const hasData = Object.keys(prices).length > 0;

  // Hide only while the very first fetch is in flight and nothing is cached
  if (isLoading && !hasData) return null;

  // Duplicate items for seamless CSS loop (animation moves -50%)
  const items = [...ASSETS, ...ASSETS];

  return (
    <div className="sw-ticker-bar">
      <div className="sw-ticker-track">
        {items.map((asset, i) => {
          const data = prices[asset.id];
          const isUp = data ? data.chg_pct >= 0 : true;
          return (
            <div key={`${asset.id}-${i}`} className="sw-ticker-item">
              <span className="sw-ticker-sym" style={{ color: asset.color }}>
                {asset.icon}&nbsp;{asset.label}
              </span>
              {data ? (
                <>
                  <span className="sw-ticker-price">
                    {fmtPrice(data.price, asset.id)}
                  </span>
                  <span className={`sw-ticker-chg ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '▲' : '▼'}&nbsp;{Math.abs(data.chg_pct).toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="sw-ticker-price" style={{ opacity: 0.25 }}>
                  —
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
