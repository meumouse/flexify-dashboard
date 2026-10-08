import { useEffect, useRef, useState } from 'react';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Icon, SearchInput, Spinner } from '@/react/ui';
import { useWoo } from '@/react/woo/WooProvider';
import type { Product } from '@/react/woo/types';

/**
 * Pick products by searching them, for upsells, cross-sells and grouped products.
 */

const FIELDS = 'id,name,sku,type,images';

type Props = {
	ids: number[];
	onChange: (ids: number[]) => void;
	placeholder?: string;
	/** Product ids that cannot be selected (e.g. the product being edited) */
	exclude?: number[];
	/** Restrict results to these product types */
	types?: string[];
};

export const ProductPicker = ({ ids, onChange, placeholder, exclude = [], types = [] }: Props) => {
	const { wc } = useWoo();

	const [search, setSearch] = useState('');
	const [results, setResults] = useState<Product[]>([]);
	const [loading, setLoading] = useState(false);
	// Names of the chosen products, so the chips keep their labels between searches.
	const known = useRef<Record<number, Product>>({});
	const [, forceRender] = useState(0);

	const remember = (products: Product[]) => {
		products.forEach((product) => {
			known.current[product.id] = product;
		});
		forceRender((value) => value + 1);
	};

	useEffect(() => {
		const missing = ids.filter((id) => !known.current[id]);

		if (!missing.length) {
			return;
		}

		wc<Product>('products', { params: { include: missing.join(','), per_page: missing.length, _fields: FIELDS } }).then((response) => remember(response.data ?? []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ids.join(',')]);

	useEffect(() => {
		const term = search.trim();

		if (term.length < 2) {
			setResults([]);
			return;
		}

		let active = true;
		setLoading(true);

		wc<Product>('products', { params: { search: term, per_page: 8, status: 'any', _fields: FIELDS } }).then((response) => {
			if (!active) {
				return;
			}

			const items = response.data ?? [];
			setResults(items.filter((product) => !exclude.includes(product.id) && (!types.length || types.includes(product.type))));
			remember(items);
			setLoading(false);
		});

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	const add = (product: Product) => {
		if (!ids.includes(product.id)) {
			onChange([...ids, product.id]);
		}

		setSearch('');
		setResults([]);
	};

	return (
		<div>
			<div className="relative">
				<SearchInput value={search} onChange={setSearch} placeholder={placeholder || __('Search products')} />
				{search.trim().length >= 2 ? (
					<div className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg custom-scrollbar dark:border-gray-800 dark:bg-gray-900">
						{loading ? (
							<div className="flex justify-center py-4">
								<Spinner />
							</div>
						) : !results.length ? (
							<p className="px-3 py-3 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No products found.')}</p>
						) : (
							results.map((product) => (
								<button
									key={product.id}
									type="button"
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/[0.03]"
									disabled={ids.includes(product.id)}
									onClick={() => add(product)}
								>
									<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
										{product.images?.[0]?.src ? <img src={product.images[0].src} alt="" className="h-full w-full object-cover" /> : <Icon name="inventory" className="text-gray-400" />}
									</span>
									<span className="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">{decodeHtml(product.name)}</span>
									{product.sku ? <span className="text-theme-xs text-gray-500 dark:text-gray-400">{product.sku}</span> : null}
								</button>
							))
						)}
					</div>
				) : null}
			</div>

			{ids.length ? (
				<ul className="mt-3 flex flex-wrap gap-2">
					{ids.map((id) => (
						<li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 text-theme-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
							<span className="truncate">{known.current[id] ? decodeHtml(known.current[id].name) : `#${id}`}</span>
							<button
								type="button"
								className="rounded-full p-0.5 text-gray-400 hover:text-error-500"
								aria-label={__('Remove product')}
								onClick={() => onChange(ids.filter((item) => item !== id))}
							>
								<Icon name="close" className="text-theme-sm" />
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
};
