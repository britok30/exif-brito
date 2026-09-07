import { Icon, type LucideProps } from 'lucide-react';

// Brand icons are not exported by the installed Lucide version.
// Keep the Instagram outline on Lucide's standard renderer and 24px grid.
export function InstagramIcon(props: LucideProps) {
  return <Icon {...props} iconNode={[
    ['rect', { x: '2', y: '2', width: '20', height: '20', rx: '5', key: 'frame' }],
    ['circle', { cx: '12', cy: '12', r: '4', key: 'lens' }],
    ['line', { x1: '17.5', y1: '6.5', x2: '17.51', y2: '6.5', key: 'flash' }],
  ]} />;
}
