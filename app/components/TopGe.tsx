"use client";

import React from 'react';

export default function TopGe() {
  // შენი ID
  const ID = 118515; 

  return (
    <div className="relative z-10 flex items-center justify-center">
      <a href={`https://www.top.ge/rating/${ID}`} target="_blank" rel="noreferrer">
        <img 
          src={`https://counter.top.ge/cgi-bin/count?ID=${ID}&D=^&show=1`} 
          alt="TOP.GE" 
          // ეს სტილები უზრუნველყოფს რომ არ გაიწeloss ან არ ჩაიკეცოს
          style={{ width: '88px', height: '31px', border: 'none', objectFit: 'contain' }} 
        />
      </a>
    </div>
  );
}