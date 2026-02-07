'use client';

import { useState } from 'react';
import { FlaskConical, ArrowDown, Dna } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Species, GeneEntry, InheritanceMode } from '@/types/database';
import {
  getLocusesForSpecies,
  crossAllLoci,
  probabilityToPercent,
  probabilityToFraction,
  type CrossResult,
} from '@/utils/genetics';
import { SPECIES_OPTIONS } from '@/lib/constants';

type Copies = 0 | 1 | 2;

const COPIES_LABELS: Record<InheritanceMode, Record<Copies, string>> = {
  '劣性': { 0: 'ノーマル', 1: 'ヘテロ', 2: 'ホモ(ビジュアル)' },
  '共優性': { 0: 'ノーマル', 1: 'ヘテロ(ビジュアル)', 2: 'スーパー' },
  '優性': { 0: 'ノーマル', 1: '保有', 2: '保有' },
};

export function MorphCalculator() {
  const [species, setSpecies] = useState<Species>('ニシアフリカトカゲモドキ');
  const [fatherGenes, setFatherGenes] = useState<GeneEntry[]>([]);
  const [motherGenes, setMotherGenes] = useState<GeneEntry[]>([]);
  const [results, setResults] = useState<CrossResult[] | null>(null);

  const locuses = getLocusesForSpecies(species);

  const handleSpeciesChange = (sp: Species) => {
    setSpecies(sp);
    setFatherGenes([]);
    setMotherGenes([]);
    setResults(null);
  };

  const updateGene = (
    side: 'father' | 'mother',
    locusName: string,
    mode: InheritanceMode,
    copies: Copies
  ) => {
    const setter = side === 'father' ? setFatherGenes : setMotherGenes;
    setter((prev) => {
      const filtered = prev.filter((g) => g.locus !== locusName);
      if (copies === 0) return filtered;
      return [...filtered, { locus: locusName, mode, copies }];
    });
  };

  const getCopies = (genes: GeneEntry[], locusName: string): Copies => {
    return genes.find((g) => g.locus === locusName)?.copies ?? 0;
  };

  const calculate = () => {
    const r = crossAllLoci(fatherGenes, motherGenes, species);
    setResults(r);
  };

  return (
    <div className="flex flex-col gap-4 px-5">
      {/* 種類選択 */}
      <div className="flex gap-2">
        {SPECIES_OPTIONS.map((sp) => (
          <button
            key={sp.value}
            type="button"
            onClick={() => handleSpeciesChange(sp.value)}
            className={`
              flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-all
              ${species === sp.value
                ? 'bg-accent-blue text-white'
                : 'bg-bg-tertiary text-text-tertiary'
              }
            `}
          >
            {sp.shortLabel}
          </button>
        ))}
      </div>

      {/* 父親 */}
      <GeneSelector
        title="オス (父親)"
        icon={<Dna size={16} />}
        locuses={locuses}
        genes={fatherGenes}
        getCopies={(name) => getCopies(fatherGenes, name)}
        onUpdate={(name, mode, copies) => updateGene('father', name, mode, copies)}
      />

      {/* 母親 */}
      <GeneSelector
        title="メス (母親)"
        icon={<Dna size={16} />}
        locuses={locuses}
        genes={motherGenes}
        getCopies={(name) => getCopies(motherGenes, name)}
        onUpdate={(name, mode, copies) => updateGene('mother', name, mode, copies)}
      />

      {/* 計算ボタン */}
      <Button onClick={calculate} fullWidth>
        <FlaskConical size={18} />
        計算する
      </Button>

      {/* 結果 */}
      {results && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <ArrowDown size={16} className="text-accent-green" />
            <h3 className="text-[16px] font-bold">計算結果</h3>
            <span className="text-[13px] text-text-tertiary">
              ({results.length}パターン)
            </span>
          </div>

          {results.map((r, i) => (
            <Card key={i} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold">{r.phenotype}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.genotype
                    .filter((g) => g.copies > 0)
                    .map((g) => (
                      <Badge key={g.locus} color="var(--accent-purple)">
                        {g.label}
                      </Badge>
                    ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[20px] font-bold text-accent-green">
                  {probabilityToPercent(r.probability)}
                </p>
                <p className="text-[12px] text-text-tertiary">
                  {probabilityToFraction(r.probability)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneSelector({
  title,
  icon,
  locuses,
  genes,
  getCopies,
  onUpdate,
}: {
  title: string;
  icon: React.ReactNode;
  locuses: ReturnType<typeof getLocusesForSpecies>;
  genes: GeneEntry[];
  getCopies: (name: string) => Copies;
  onUpdate: (name: string, mode: InheritanceMode, copies: Copies) => void;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent-blue">{icon}</span>
        <h3 className="text-[15px] font-bold">{title}</h3>
      </div>
      <div className="flex flex-col gap-2">
        {locuses.map((locus) => {
          const current = getCopies(locus.name);
          return (
            <div key={locus.name} className="flex items-center gap-2">
              <span className="text-[13px] text-text-secondary w-28 shrink-0 truncate">
                {locus.name}
              </span>
              <div className="flex gap-1 flex-1">
                {([0, 1, 2] as Copies[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdate(locus.name, locus.mode, c)}
                    className={`
                      flex-1 rounded-[10px] py-1.5 text-[11px] font-medium transition-all
                      ${current === c
                        ? 'bg-accent-blue text-white'
                        : 'bg-bg-tertiary text-text-tertiary'
                      }
                    `}
                  >
                    {COPIES_LABELS[locus.mode][c]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
