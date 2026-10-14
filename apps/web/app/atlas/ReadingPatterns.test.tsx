import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {it,expect,afterEach} from 'vitest';
import ReadingPatterns, {type Patterns} from './ReadingPatterns';
afterEach(cleanup);
const empty:Patterns={current:0,previous:0,classified:[0,0],start:'2026-08-15',split:'2026-09-14',end:'2026-10-14',topics:[],connections:[],truncated:false};
it('explains sparse data without prescribing reviews',()=>{
 render(<ReadingPatterns patterns={empty}/>);
 expect(screen.getByText(/Save words as you read/)).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
 expect(screen.getByText(/No shared topic links yet/)).toBeTruthy();
});
it('shows comparable counts, topic evidence and partial coverage',()=>{
 render(<ReadingPatterns patterns={{...empty,current:4,previous:2,classified:[2,1],topics:[{name:'Ecology',current:2,previous:1}],connections:[{topics:['Ecology','Economics'],words:['yield']}],truncated:true}}/>);
 expect(screen.getByRole('table',{name:'Captures by suggested topic'})).toBeTruthy();
 expect(screen.getByText('Ecology ↔ Economics')).toBeTruthy();
 expect(screen.getByText('yield')).toBeTruthy();
 expect(screen.getByText(/2 of 4 recent captures/)).toBeTruthy();
 expect(screen.getByText(/counts are partial/)).toBeTruthy();
});
