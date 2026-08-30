'use client';

interface LesuurColumnHeaderProps {
  hour: number;
  teacher: string;
}

/** Kolomkop lesuur met docent-badge (rooster). */
export default function LesuurColumnHeader({ hour, teacher }: LesuurColumnHeaderProps) {
  return (
    <th
      scope="col"
      className="border border-white/20 px-1 py-1.5 text-center font-semibold text-xs text-white min-w-[52px]"
    >
      <span className="block text-sm font-bold text-white/95">L{hour}</span>
      {teacher ? (
        <span
          className="mt-1 inline-flex max-w-[96px] items-center justify-center truncate rounded-md border border-amber-400/35 bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium leading-tight text-amber-100"
          title={`Docent lesuur ${hour}: ${teacher}`}
        >
          {teacher}
        </span>
      ) : (
        <span className="mt-1 block text-[9px] text-white/30" title="Geen docent in rooster">
          —
        </span>
      )}
    </th>
  );
}
