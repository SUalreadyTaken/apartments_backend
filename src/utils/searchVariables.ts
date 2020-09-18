// c24Parishes
export const c24CityPartsSet: Set<string> = new Set([
	'Kadriorg',
	'Vanalinn',
	'Haabersti linnaosa',
	'Kesklinna linnaosa',
	'Kristiine linnaosa',
	'Lasnamäe linnaosa',
	'Mustamäe linnaosa',
	'Nõmme linnaosa',
	'Pirita linnaosa',
	'Põhja-Tallinna linnaosa',
]);

// kvParishes
export const kvCityPartsSet: Set<string> = new Set([
  'Kadriorg',
	'Vanalinn',
	'Haabersti',
	'Kesklinn',
	'Kristiine',
	'Lasnamäe',
	'Mustamäe',
	'Nõmme',
	'Pirita',
	'Põhja-Tallinn',
]);

export const c24CityPartsTrimmedMap: Map<string, string> = new Map([
  ['Kadriorg', 'Kadriorg'],
	['Vanalinn', 'Vanalinn'],
	['Haabersti linnaosa', 'Haabersti'],
	['Kesklinna linnaosa', 'Kesklinn'],
	['Kristiine linnaosa', 'Kristiine'],
	['Lasnamäe linnaosa', 'Lasnamäe'],
	['Mustamäe linnaosa', 'Mustamäe'],
	['Nõmme linnaosa', 'Nõmme'],
	['Pirita linnaosa', 'Pirita'],
	['Põhja-Tallinna linnaosa', 'Põhja-Tallinn'],
])

//DONT NEED THEM ANYMORE
export const kvCountyCodeMap: Map<string, string> = new Map([
  ['Harjumaa', '1'],
	['Hiiumaa', '2'],
	['Ida-Virumaa', '3'],
	['Jõgevamaa', '4'],
	['Järvamaa', '5'],
	['Läänemaa', '6'],
	['Läänemaa-Virumaa', '7'],
	['Põlvamaa', '8'],
	['Pärnumaa', '9'],
	['Raplamaa', '10'],
	['Saaremaa', '11'],
	['Tartumaa', '12'],
	['Valgamaa', '13'],
	['Viljandimaa', '14'],
	['Võrumaa', '15'],
]);

export const kvParishCodeMap: Map<string, string> = new Map([
	['Anija vald', '1001'],
	['Aegviidu vald', '1'],
	['Anija vald', '2'],
	['Harku vald', '1006'],
	['Jõelähtme vald', '1009'],
	['Keila', '1018'],
	['Kiili vald', '1020'],
	['Kose vald', '1023'],
	['Kuusalu vald', '1024'],
	['Lääne-Harju vald', '1027'],
	['Keila vald', '5'],
	['Padise vald', '13'],
	['Vasalemma vald', '18'],
	['Paldiski', '419'],
	['Loksa', '1025'],
	['Maardu', '1031'],
	['Raasiku vald', '1047'],
	['Rae vald', '1048'],
	['Saku vald', '1057'],
	['Saue vald', '1058'],
	['Kernu vald', '6'],
	['Nissi vald', '12'],
	['Saue vald', '17'],
	['Saue', '420'],
	['Tallinn', '1061'],
	['Viimsi vald', '1070'],
]);
