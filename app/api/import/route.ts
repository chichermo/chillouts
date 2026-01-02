import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppData } from '@/types';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'imported_data.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const data: AppData = JSON.parse(fileContents);
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Gegevens succesvol geladen'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Onbekende fout'
    }, { status: 500 });
  }
}

