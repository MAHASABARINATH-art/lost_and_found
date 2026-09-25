import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, FileText, PackageSearch, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/types';
import type { LostItem, FoundItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/AppLayout';
import { Card, Input, Select, Button, ItemImage, EmptyState } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';

type ResultItem = (LostItem | FoundItem) & { _type: 'lost' | 'found' };

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<'all' | 'lost' | 'found'>('all');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    let lostQuery = supabase.from('lost_items').select('*').neq('status', 'Archived');
    let foundQuery = supabase.from('found_items').select('*').neq('status', 'Archived');

    if (keyword) {
      const kw = keyword.toLowerCase();
      lostQuery = lostQuery.or(`item_name.ilike.%${kw}%,description.ilike.%${kw}%,brand.ilike.%${kw}%`);
      foundQuery = foundQuery.or(`item_name.ilike.%${kw}%,description.ilike.%${kw}%,brand.ilike.%${kw}%`);
    }
    if (category) {
      lostQuery = lostQuery.eq('category', category);
      foundQuery = foundQuery.eq('category', category);
    }
    if (location) {
      lostQuery = lostQuery.ilike('location_lost', `%${location}%`);
      foundQuery = foundQuery.ilike('location_found', `%${location}%`);
    }
    if (color) {
      lostQuery = lostQuery.ilike('color', `%${color}%`);
      foundQuery = foundQuery.ilike('color', `%${color}%`);
    }
    if (brand) {
      lostQuery = lostQuery.ilike('brand', `%${brand}%`);
      foundQuery = foundQuery.ilike('brand', `%${brand}%`);
    }
    if (dateFrom) {
      lostQuery = lostQuery.gte('date_lost', dateFrom);
      foundQuery = foundQuery.gte('date_found', dateFrom);
    }
    if (dateTo) {
      lostQuery = lostQuery.lte('date_lost', dateTo);
      foundQuery = foundQuery.lte('date_found', dateTo);
    }

    type LostQueryResult = { data: LostItem[] | null };
    type FoundQueryResult = { data: FoundItem[] | null };
    const promises: Promise<LostQueryResult | FoundQueryResult>[] = [];
    if (type === 'all' || type === 'lost') {
      promises.push(lostQuery.order('created_at', { ascending: false }) as unknown as Promise<LostQueryResult>);
    } else {
      promises.push(Promise.resolve({ data: null }));
    }
    if (type === 'all' || type === 'found') {
      promises.push(foundQuery.order('created_at', { ascending: false }) as unknown as Promise<FoundQueryResult>);
    } else {
      promises.push(Promise.resolve({ data: null }));
    }

    const [lostData, foundData] = await Promise.all(promises) as [LostQueryResult, FoundQueryResult];
    const lostItems = (lostData.data || []).map((i) => ({ ...(i as LostItem), _type: 'lost' as const }));
    const foundItems = (foundData.data || []).map((i) => ({ ...(i as FoundItem), _type: 'found' as const }));
    const combined = [...lostItems, ...foundItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setResults(combined);
    setLoading(false);
  }, [keyword, type, category, location, color, brand, dateFrom, dateTo]);

  useEffect(() => {
    search();
  }, [search]);

  const clearFilters = () => {
    setKeyword('');
    setType('all');
    setCategory('');
    setLocation('');
    setColor('');
    setBrand('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = keyword || category || location || color || brand || dateFrom || dateTo || type !== 'all';

  return (
    <div>
      <PageHeader title="Search Items" subtitle="Search across all lost and found reports" />

      <Card className="p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by item name, description, or brand..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
          </div>
          <Button onClick={search} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <div className="flex gap-2">
                {(['all', 'lost', 'found'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                      type === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'all' ? 'All Items' : t === 'lost' ? 'Lost' : 'Found'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Library" />
              <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Black" />
              <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Dell" />
              <Input label="Date From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input label="Date To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 text-sm text-slate-500">
        {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
      </div>

      {results.length === 0 && !loading ? (
        <EmptyState
          icon={SearchIcon}
          title="No items found"
          message={hasSearched ? "Try adjusting your search or filters to find what you're looking for." : 'Start searching for lost and found items.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((item) => (
            <Link
              key={item._type + item.id}
              to={`/item/${item._type}/${item.id}`}
              className="group"
            >
              <Card className="overflow-hidden group-hover:shadow-md transition-shadow h-full">
                <ItemImage
                  src={item.image_url}
                  alt={item.item_name}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.item_name}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    {item._type === 'lost' ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <PackageSearch className="w-3.5 h-3.5" />
                    )}
                    <span className="capitalize">{item._type}</span>
                    <span>·</span>
                    <span>{item.category}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item._type === 'lost' ? (item as LostItem).location_lost : (item as FoundItem).location_found}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(item._type === 'lost' ? (item as LostItem).date_lost : (item as FoundItem).date_found)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
