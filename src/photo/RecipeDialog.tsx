'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PhotoMark } from '@/components/icons/photo-mark';
import {
  labelForFujifilmSimulation,
  type FujifilmRecipe,
} from '@/exif/fujifilm';
import { cn } from '@/lib/utils';

const titleCase = (s: string) =>
  s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatSigned = (n: number | undefined) => {
  if (n === undefined) return undefined;
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
};

const formatRange = (range: 'standard' | 'wide') =>
  range === 'wide' ? 'Wide' : 'Standard';

interface Spec {
  label: string;
  value: string;
}

const buildSpecs = (recipe: FujifilmRecipe): Array<{ heading: string; rows: Spec[] }> => {
  const sections: Array<{ heading: string; rows: Spec[] }> = [];

  // Tone
  const tone: Spec[] = [];
  if (recipe.highlight !== undefined)
    tone.push({ label: 'Highlight', value: formatSigned(recipe.highlight)! });
  if (recipe.shadow !== undefined)
    tone.push({ label: 'Shadow', value: formatSigned(recipe.shadow)! });
  if (recipe.color !== undefined)
    tone.push({ label: 'Color', value: formatSigned(recipe.color)! });
  if (recipe.sharpness !== undefined)
    tone.push({ label: 'Sharpness', value: formatSigned(recipe.sharpness)! });
  if (recipe.clarity !== undefined && recipe.clarity !== 0)
    tone.push({ label: 'Clarity', value: formatSigned(recipe.clarity)! });
  if (tone.length > 0) sections.push({ heading: 'Tone', rows: tone });

  // White Balance
  const wb: Spec[] = [{ label: 'Type', value: titleCase(recipe.whiteBalance.type) }];
  if (recipe.whiteBalance.colorTemperature !== undefined)
    wb.push({
      label: 'Color Temp',
      value: `${recipe.whiteBalance.colorTemperature}K`,
    });
  if (recipe.whiteBalance.red !== 0)
    wb.push({ label: 'Red', value: formatSigned(recipe.whiteBalance.red)! });
  if (recipe.whiteBalance.blue !== 0)
    wb.push({ label: 'Blue', value: formatSigned(recipe.whiteBalance.blue)! });
  sections.push({ heading: 'White Balance', rows: wb });

  // Effects
  const fx: Spec[] = [];
  if (recipe.colorChromeEffect)
    fx.push({ label: 'Color Chrome', value: titleCase(recipe.colorChromeEffect) });
  if (recipe.colorChromeFXBlue)
    fx.push({ label: 'Color Chrome FX Blue', value: titleCase(recipe.colorChromeFXBlue) });
  if (recipe.grainEffect.roughness !== 'off' || recipe.grainEffect.size !== 'off') {
    fx.push({ label: 'Grain Roughness', value: titleCase(recipe.grainEffect.roughness) });
    fx.push({ label: 'Grain Size', value: titleCase(recipe.grainEffect.size) });
  }
  if (fx.length > 0) sections.push({ heading: 'Effects', rows: fx });

  // Dynamic Range
  sections.push({
    heading: 'Dynamic Range',
    rows: [
      { label: 'Range', value: formatRange(recipe.dynamicRange.range) },
      { label: 'Setting', value: titleCase(recipe.dynamicRange.setting) },
      { label: 'Development', value: `${recipe.dynamicRange.development}%` },
    ],
  });

  // Noise
  const noise: Spec[] = [];
  if (recipe.highISONoiseReduction !== undefined && recipe.highISONoiseReduction !== 0)
    noise.push({
      label: 'High ISO NR',
      value: formatSigned(recipe.highISONoiseReduction)!,
    });
  if (recipe.noiseReductionBasic && recipe.noiseReductionBasic !== 'n/a')
    noise.push({ label: 'Basic NR', value: titleCase(recipe.noiseReductionBasic) });
  if (noise.length > 0) sections.push({ heading: 'Noise', rows: noise });

  return sections;
};

interface RecipeDialogProps {
  film: string;
  /** Pass the recipe when it is already at hand (the photograph page)... */
  recipe?: FujifilmRecipe;
  /** ...or the photograph's id, and it is fetched the first time the dialog opens (gallery tiles). */
  photoId?: string;
  make?: string;
  trigger?: React.ReactNode;
}

export function RecipeDialog({ film, recipe: given, photoId, make, trigger }: RecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [fetched, setFetched] = useState<FujifilmRecipe | null>(null);
  const [failed, setFailed] = useState(false);
  const recipe = given ?? fetched;
  useEffect(() => {
    if (!open || recipe || !photoId) return;
    let cancelled = false;
    setFailed(false);
    fetch(`/api/recipe/${photoId}`).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ recipe: FujifilmRecipe | null }>; })
      .then(data => { if (!cancelled) { if (data.recipe?.whiteBalance) setFetched(data.recipe); else setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [open, recipe, photoId]);
  const sections = recipe ? buildSpecs(recipe) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`View ${labelForFujifilmSimulation(film)} recipe`}
        className={cn(
          'group flex items-center gap-2 transition-colors hover:text-foreground',
        )}
      >
        {trigger ?? (
          <>
            <PhotoMark
              make={make}
              film={film}
              height={16}
              className="text-foreground"
            />
            <span className="text-sm tracking-tight font-light text-foreground group-hover:text-foreground">
              {labelForFujifilmSimulation(film)}
            </span>
          </>
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          'w-[90vw] max-w-3xl gap-0 rounded-none border-foreground bg-background',
          'p-0 sm:max-w-3xl',
        )}
        showCloseButton
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col gap-8 px-6 py-12 sm:p-10"
        >
          <DialogHeader className="space-y-3 pr-8 text-left">
            <p className="gallery-label">
              Fujifilm Recipe
            </p>
            <DialogTitle className="text-3xl leading-tight tracking-tight font-light text-foreground">
              {labelForFujifilmSimulation(film)}
            </DialogTitle>
          </DialogHeader>

          {!recipe && <p className="gallery-label" role="status">{failed ? 'The recipe couldn’t load. Close and try again.' : 'Loading recipe…'}</p>}
          <div className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            {sections.map(section => (
              <section key={section.heading} className="space-y-3">
                <h3 className="gallery-label">
                  {section.heading}
                </h3>
                <dl className="space-y-2">
                  {section.rows.map(row => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-x-6 gap-y-1 text-sm"
                    >
                      <dt className="text-foreground">{row.label}</dt>
                      <dd className="min-w-0 text-right font-light tabular-nums text-foreground [overflow-wrap:anywhere]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
