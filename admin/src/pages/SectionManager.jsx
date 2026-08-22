import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { getEraAccent } from '@/config/branding';

// Halaman ini murni navigator: pilih Era -> pilih Tahun -> langsung masuk ke
// SectionWorkspace (gabungan section + blok konten + tokoh terkait). CRUD
// Era/Tahun sendiri ada di halaman "Kelola Era & Tahun".
export default function SectionManager() {
  const navigate = useNavigate();

  const [eras, setEras] = useState([]);
  const [expandedEraId, setExpandedEraId] = useState(null);
  const [yearsByEra, setYearsByEra] = useState({});
  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEras();
  }, []);

  async function fetchEras() {
    setLoadingEras(true);
    setError(null);
    try {
      const res = await api.get('/admin/eras');
      setEras(res.data);
    } catch (err) {
      setError('Gagal memuat daftar era.');
    } finally {
      setLoadingEras(false);
    }
  }

  async function fetchYears(eraId) {
    setLoadingYears(true);
    try {
      const res = await api.get('/admin/years', { params: { era_id: eraId } });
      setYearsByEra((prev) => ({ ...prev, [eraId]: res.data }));
    } catch (err) {
      setError('Gagal memuat daftar tahun.');
    } finally {
      setLoadingYears(false);
    }
  }

  function toggleExpand(era) {
    if (expandedEraId === era.id) {
      setExpandedEraId(null);
      return;
    }
    setExpandedEraId(era.id);
    if (!yearsByEra[era.id]) fetchYears(era.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Section</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih era lalu tahun untuk masuk ke workspace section — blok konten & tokoh terkait diatur di sana.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadingEras ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : eras.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada era. Tambahkan dulu di halaman Kelola Era & Tahun.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {eras.map((era) => {
            const isExpanded = expandedEraId === era.id;
            const eraYears = [...(yearsByEra[era.id] || [])].sort((a, b) => a.year - b.year);
            const accent = getEraAccent(era.slug);

            return (
              <Card key={era.id} className={cn(isExpanded && 'sm:col-span-2 xl:col-span-3')}>
                <CardContent className="p-4">
                  <button
                    onClick={() => toggleExpand(era)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <p className="flex min-w-0 items-center gap-2 truncate font-medium">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: accent.hex }}
                        title={accent.label}
                      />
                      <span className="text-muted-foreground">{era.order}.</span> {era.name}
                    </p>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {loadingYears && !yearsByEra[era.id] ? (
                        <p className="text-sm text-muted-foreground">Memuat...</p>
                      ) : eraYears.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Belum ada tahun di era ini. Tambahkan dulu di halaman Kelola Era & Tahun.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {eraYears.map((year) => (
                            <button
                              key={year.id}
                              onClick={() => navigate(`/sections/workspace/${year.id}`)}
                              className="group flex items-center justify-between gap-2 rounded-lg border bg-secondary/20 p-3 text-left transition-colors hover:bg-secondary/50"
                            >
                              <p className="min-w-0 flex-1 truncate text-sm">
                                <span className="font-medium">{year.year}</span>{' '}
                                <span className="text-muted-foreground">— {year.title}</span>
                              </p>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}