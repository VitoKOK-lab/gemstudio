// Reference catalogue only. Difficulty is a game design estimate, not an industry grade.
export const catalog=[
['經典與常青','圓形明亮式','Round Brilliant','進階','round','標準圓形輪廓與明亮式刻面配置；需兼顧角度、對稱與交會精度。'],
['經典與常青','橢圓形','Oval','進階','oval','拉長的圓潤輪廓；需處理長寬比例、刻面交會與可能的蝴蝶結暗區。'],
['經典與常青','祖母綠式','Emerald','熟練','emerald','切角長方形與階梯刻面，著重平行線條、對稱和透明度。'],
['經典與常青','馬眼形','Marquise','高難度','marquise','兩端尖角的拉長輪廓；尖端保護與兩側對稱是加工重點。'],
['經典與常青','梨形','Pear','高難度','pear','圓弧與尖端結合；長寬比例、肩部形狀和中心線需平衡。'],
['復古與古董','老礦式','Old Mine','進階','cushion','常見墊形輪廓、高冠、小台面與較大底尖刻面；歷史作品比例並不統一。'],
['復古與古董','玫瑰式','Rose','熟練','rose','平底、隆起頂部與三角刻面；存在不同刻面數及配置的變體。'],
['復古與古董','莫臥兒風格','Mughal','高難度','oval','歷史切磨傳統中的多樣形態，常因原石保重而調整；不是單一固定圖紙。'],
['復古與古董','肖像式','Portrait','高難度','portrait','薄片狀、較大平面與邊緣加工，強調通透；不能等同所有莫臥兒風格。'],
['復古與古董','凹雕','Intaglio','專門工藝','intaglio','向石面內部雕出圖案，需要雕刻工具與非凸幾何；不適用單純平面磨削。'],
['創新與幾何','長形墊形','Elongated Cushion','進階','cushion','拉長的圓角方形輪廓；刻面配置有多種變體，價值須看個別成品。'],
['創新與幾何','雷迪恩式','Radiant','高難度','emerald','切角矩形或方形輪廓搭配明亮式風格刻面，兼顧線條與光學表現。'],
['創新與幾何','阿斯切式','Asscher','進階','asscher','方形切角階梯式；典型外觀呈現同心階梯與鏡廳效果。'],
['創新與幾何','六角形','Hexagon','熟練','hexagon','六邊形是輪廓分類，仍須選定具體刻面圖紙；不能只由外形推定難度。'],
['創新與幾何','菱形','Lozenge','進階','lozenge','菱形輪廓；尖角、比例與刻面設計共同影響保重和加工難度。'],
['創新與幾何','風箏形','Kite','進階','kite','風箏狀輪廓；上下比例不同，需依特定圖紙處理刻面交會。'],
['創新與幾何','弧面','Cabochon','專門工藝','cabochon','連續光滑圓頂，需要曲面磨削與拋光；星光、貓眼必須來自適合的材料與定向。']
];
export function cutIcon(shape){const paths={triangle:'M50 8 L94 84 H6 Z',round:'M50 10 A40 40 0 1 1 49.99 10',oval:'M50 7 A29 43 0 1 1 49.99 7',emerald:'M31 8 H69 L80 20 V80 L69 92 H31 L20 80 V20 Z',asscher:'M25 13 H75 L87 25 V75 L75 87 H25 L13 75 V25 Z',marquise:'M50 5 Q105 50 50 95 Q-5 50 50 5',pear:'M50 5 C39 30 15 45 19 67 C24 106 81 102 82 67 C85 45 61 27 50 5',cushion:'M33 8 Q17 8 17 28 V72 Q17 92 33 92 H67 Q83 92 83 72 V28 Q83 8 67 8 Z',hexagon:'M50 5 L89 27 V73 L50 95 L11 73 V27 Z',lozenge:'M50 5 L83 50 L50 95 L17 50 Z',kite:'M50 5 L85 35 L50 95 L15 35 Z',portrait:'M30 10 H70 Q82 10 82 25 V75 Q82 90 70 90 H30 Q18 90 18 75 V25 Q18 10 30 10 Z',rose:'M50 10 A40 40 0 1 1 49.99 10',cabochon:'M18 75 C18 5 82 5 82 75 Q50 90 18 75',intaglio:'M50 10 A35 40 0 1 1 49.99 10'};return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${paths[shape]}" fill="#eadfeb" stroke="#ad89a3" stroke-width="1.3"/>${['cabochon','intaglio','portrait'].includes(shape)?'<path d="M32 40 Q50 20 66 40" fill="none" stroke="#fff9ff" stroke-width="3"/>':'<path d="M50 20 L72 40 L66 69 L34 69 L28 40 Z M50 20 V10 M72 40 L85 35 M66 69 L75 85 M34 69 L25 85 M28 40 L15 35" fill="none" stroke="#fff9ff" stroke-width="1.3"/>'}</svg>`;}
