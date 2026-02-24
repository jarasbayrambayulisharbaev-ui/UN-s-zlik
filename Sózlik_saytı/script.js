document.addEventListener('DOMContentLoaded', () => {
    
    // --- Fayl nomlari (.csv formatida) ---
    const DICTIONARY_FILES = {
        'main-dictionary': 'dictionary.csv',
        'proverbs-dictionary': 'proverbs.csv',
        'names-dictionary': 'names.csv',
        'phraseology-dictionary': 'phraseology.csv',
        'orphography-dictionary': 'orphography.csv'
    };
    
    // Qaraqalpaq Kirill alifbosi
    function getCyrillicAlphabet() {
        return ['А', 'Á', 'B', 'D', 'E', 'F', 'G', 'Ǵ', 'J', 'Z', 'Í', 'I', 'K', 'Q', 'L', 'M', 'N', 'Ń', 'O', 'Ó', 'P', 'R', 'S', 'T', 'U', 'Ú', 'F', 'X', 'H', 'C', 'Ch', 'Sh'];
    }

    // Lug'at ma'lumotlarini saqlash uchun ob'ekt
    const dictionaries = {};

    // Elementlarga murojaatni tayyorlash (HTML ID'lari bilan bog'lash)
    Object.keys(DICTIONARY_FILES).forEach(key => {
        const isMain = key === 'main-dictionary';
        const inputId = isMain ? 'searchInput' : key.replace('-dictionary', 'SearchInput');
        const buttonId = isMain ? 'searchButton' : key.replace('-dictionary', 'SearchButton');
        const resultsId = isMain ? 'resultsArea' : key.replace('-dictionary', 'ResultsArea');
        const indexListId = isMain ? 'mainIndexList' : key.replace('-dictionary', 'IndexList');
        
        dictionaries[key] = {
            file: DICTIONARY_FILES[key],
            data: {},
            input: document.getElementById(inputId),
            button: document.getElementById(buttonId),
            results: document.getElementById(resultsId),
            indexList: document.getElementById(indexListId),
            alphabet: getCyrillicAlphabet(),
            placeholder: document.querySelector(`#${key} .search-area-wrapper p`) ? document.querySelector(`#${key} .search-area-wrapper p`).textContent : 'Izlew...',
            searchOptions: document.querySelectorAll(`input[name="search-type-${key.replace('-dictionary', '')}"]`)
        };
    });

    // Navigatsiya elementlari
    const navLinks = document.querySelectorAll('nav .nav-link');
    const dictionarySections = document.querySelectorAll('.dictionary-section, .info-section');
    
    // --- CSV tahlil qilish funksiyasi (Ma'lumotlarni o'qish) ---
    function parseProtectedLine(line) {
        const fields = []; let currentField = ''; let inQuotes = false; const len = line.length;
        for (let i = 0; i < len; i++) {
            const char = line[i]; const nextChar = (i < len - 1) ? line[i + 1] : null;
            if (char === '"') {
                if (inQuotes && nextChar === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) { fields.push(currentField.trim()); currentField = ''; } 
            else { currentField += char; }
        }
        fields.push(currentField.trim());
        if (fields.length >= 2) {
            const word = fields[0]; 
            const definition = fields.slice(1).join(',').trim(); 
            if (word && (definition || fields.length === 2)) { 
                return { word: word, definition: definition }; 
            }
        } else if (fields.length === 1 && fields[0]) {
            return { word: fields[0], definition: '' };
        }
        return null;
    }

    // --- Index List uchun alohida so'z yaratish ---
    function createIndexListItem(dictKey, word, definition) {
        const listItem = document.createElement('li');
        let displayWord = word.charAt(0).toUpperCase() + word.slice(1);
        
        // Naqillar/Frazeologiya uchun yangi qatorlarni HTMLga aylantirish
        if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
             displayWord = displayWord.replace(/\\n/g, '<br>');
        }
        
        listItem.innerHTML = displayWord;
        
        // Ro'yxatdagi so'zni bosganda o'ng tomonda to'liq ma'noni ko'rsatish
        listItem.addEventListener('click', () => {
            const dict = dictionaries[dictKey];
            
            // Barcha list elementlaridan 'selected' klassini olib tashlash
            const activeItems = dict.indexList.querySelectorAll('li.selected');
            activeItems.forEach(item => item.classList.remove('selected'));
            // Bosilgan elementga 'selected' klassini qo'shish
            listItem.classList.add('selected');
            
            let resultDefinition = definition;
            if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
                 resultDefinition = resultDefinition.replace(/\\n/g, '<br>');
            }
            
            const definitionHtml = resultDefinition ? `<span class="definition-text">: ${resultDefinition}</span>` : '';

            if (dict.results) { 
                dict.results.innerHTML = `<div class="index-word-result"><strong>${word}</strong>${definitionHtml}</div>`; // Original word ishlatildi
                dict.results.scrollIntoView({ behavior: 'smooth' });
            }
            if (dict.input) dict.input.value = ''; 
        });
        return listItem;
    }
    
    // --- Index ro'yxatini yaratish funksiyasi (Chap ustunni to'ldirish) ---
    function buildIndexList(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.indexList || Object.keys(dict.data).length === 0) {
             return; 
        }
        
        dict.indexList.classList.remove('loading-state');
        const words = Object.keys(dict.data).sort((a, b) => a.localeCompare(b, 'kar', { sensitivity: 'base' }));
        dict.indexList.innerHTML = ''; 

        const alphaContainer = document.createElement('div');
        alphaContainer.classList.add('alpha-filter');
        dict.indexList.appendChild(alphaContainer);
        
        const listContainer = document.createElement('ul');
        dict.indexList.appendChild(listContainer);

        // So'zlarni harflar bo'yicha guruhlash
        const groups = {};
        words.forEach(word => {
            const firstLetter = word.toUpperCase().charAt(0);
            
            // Qaraqalpaq alifbosini tekshirish
            let groupLetter = dict.alphabet.find(l => word.toUpperCase().startsWith(l.toUpperCase()));
            
            if (groupLetter) {
                if (!groups[groupLetter]) { groups[groupLetter] = []; }
                groups[groupLetter].push(word);
            } else if (dict.alphabet.includes(firstLetter)) {
                 // Standart harflar
                 if (!groups[firstLetter]) { groups[firstLetter] = []; }
                 groups[firstLetter].push(word);
            }
        });
        
        // Tanlangan harf bo'yicha so'zlarni ko'rsatish
        const showWordsByLetter = (letter) => {
            listContainer.innerHTML = '';
            const wordsToShow = groups[letter];
            
            if (wordsToShow && wordsToShow.length > 0) {
                wordsToShow.forEach(word => {
                       const listItem = createIndexListItem(dictKey, word, dict.data[word]);
                       listContainer.appendChild(listItem);
                });
            } else {
                listContainer.innerHTML = '<p style="text-align:center; color:#e74c3c;">Bul háripke tiyisli sóz tabılmadı.</p>';
            }
        };

        // Alifbo tugmalarini yaratish
        dict.alphabet.forEach(letter => {
            if (groups[letter] && groups[letter].length > 0) { // Faqat so'z bor harflarni ko'rsatish
                const button = document.createElement('button');
                button.textContent = letter;
                button.addEventListener('click', () => {
                    alphaContainer.querySelectorAll('.active').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    showWordsByLetter(letter);
                });
                alphaContainer.appendChild(button);
            }
        });
        
        // !!! MUHIM TUZATISH JOYI: Ro'yxatni avtomatik to'ldirish !!!
        // Yuklagandan so'ng, birinchi mavjud harfni avtomatik bosish
        const firstAvailableLetter = dict.alphabet.find(letter => groups[letter] && groups[letter].length > 0);
        if (firstAvailableLetter) {
            const firstButton = Array.from(alphaContainer.querySelectorAll('button')).find(btn => btn.textContent === firstAvailableLetter);
            if (firstButton) {
                firstButton.classList.add('active');
                showWordsByLetter(firstAvailableLetter); 
            }
        }
        
        // Agar hech qanday tugma bo'lmasa (lug'at bo'sh bo'lsa) xabarnoma ko'rsatish
        if (alphaContainer.children.length === 0) {
             listContainer.innerHTML = '<p class="no-results-message">Maǵlıwmatlar bazası bos yamasa formatı nadurıs.</p>';
        }
    }

    // --- Lug'at faylini yuklash funksiyasi ---
    function loadDictionary(dictKey) {
        const dict = dictionaries[dictKey];
        
        if (!dict || !dict.input || !dict.results || !dict.indexList) {
             console.error(`Xato: ${dictKey} uchun kerakli HTML elementi topilmadi. ID nomlarini tekshiring!`);
             return;
        }

        // Qidiruv maydonlarini yuklash vaqtida o'chirib qo'yish
        dict.input.disabled = true; // Yuklash tugaguncha o'chiq tursin
        if(dict.button) dict.button.disabled = true;
        
        dict.results.innerHTML = '<p class="initial-message">Sózlik júklenbekte...</p>';
        dict.indexList.innerHTML = '<div class="loader-placeholder">Júklenbekte...</div>'; 
        dict.indexList.classList.add('loading-state');


        fetch(dict.file)
             .then(response => {
                 if (!response.ok) { 
                     throw new Error(`Fayl ${dict.file} topilmadi/yuklanmadi.`); 
                 }
                 return response.text();
             })
             .then(text => {
                 const lines = text.split('\n').filter(line => line.trim() !== '');
                 dict.data = {}; 
                 lines.forEach((line) => {
                     const parsed = parseProtectedLine(line);
                     if (parsed) { dict.data[parsed.word.toLowerCase()] = parsed.definition; }
                 });

                 dict.input.disabled = false; // Yuklash tugagandan so'ng yoqish
                 if(dict.button) dict.button.disabled = false;

                 if (Object.keys(dict.data).length > 0) {
                     console.log(`✅ ${dictKey} yuklandi. ${Object.keys(dict.data).length} sóz topıldı.`);
                     dict.results.innerHTML = `<p class="initial-message">Sózlik júklendi. ${Object.keys(dict.data).length} sóz bar. Izlew múmkin.</p>`;
                     // Ma'lumot yuklangandan so'ng index listni yaratish
                     buildIndexList(dictKey); 
                 } else {
                     console.warn(`⚠️ ${dictKey} faylı bos yamasa formatı nadurıs.`);
                     dict.input.disabled = true; 
                     if(dict.button) dict.button.disabled = true; 
                     dict.results.innerHTML = '<p class="no-results-message">Sózlik faylı bos yamasa formatı nadurıs.</p>';
                     dict.indexList.innerHTML = '<p class="no-results-message">Maǵlıwmatlar bazası bos.</p>';
                     dict.indexList.classList.remove('loading-state');
                     dict.input.placeholder = "Sózlik júklenbedi...";
                 }
             })
             .catch(error => {
                 console.error(`❌ JÚKLEW QÁTESI: ${dict.file} ni yuklashda xato.`, error);
                 
                 dict.input.disabled = true;
                 if(dict.button) dict.button.disabled = true;
                 
                 dict.results.innerHTML = `<p class="no-results-message" style="color:red; font-weight:bold;">❌ JÚKLEW QÁTESI: ${error.message}. Fayl yo'lini tekshiring.</p>`;
                 dict.indexList.innerHTML = '<p class="no-results-message">Júklewde qáte.</p>';
                 dict.indexList.classList.remove('loading-state');
                 dict.input.placeholder = "Sózlik júklenbedi...";
             });
    }

    // --- Qidiruv funksiyasi ---
    function performSearch(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.input || dict.input.disabled || !dict.results) return; 

        const searchTerm = dict.input.value.toLowerCase().trim();
        dict.results.innerHTML = '';

        if (searchTerm.length === 0) {
            dict.results.innerHTML = '<p class="initial-message">Izlew nátiyjeleri bul jerde kórinedi.</p>';
            return;
        }
        
        const searchType = dict.searchOptions ? Array.from(dict.searchOptions).find(radio => radio.checked).value : 'includes';

        const matchingWords = Object.keys(dict.data).filter(word => {
            if (searchType === 'startswith') {
                return word.startsWith(searchTerm);
            } else { 
                return word.includes(searchTerm);
            }
        }).sort((a, b) => a.localeCompare(b, 'kar', { sensitivity: 'base' })); 

        if (matchingWords.length > 0) {
            matchingWords.forEach(word => {
                let definition = dict.data[word];
                
                if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
                    definition = definition.replace(/\\n/g, '<br>');
                }

                const resultElement = document.createElement('p');
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                
                let wordContentForDisplay = word.charAt(0).toUpperCase() + word.slice(1);
                
                if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
                     wordContentForDisplay = word.replace(/\\n/g, '<br>');
                }

                // E'tibor bering, so'zning o'zini to'g'ri ajratib ko'rsatish uchun uni to'g'ri formatladim.
                const highlightedWord = wordContentForDisplay.replace(regex, '<span class="highlight">$1</span>'); 
                const definitionHtml = definition ? `: ${definition}` : '';

                resultElement.innerHTML = `<strong>${highlightedWord}</strong>${definitionHtml}`;
                dict.results.appendChild(resultElement);
            });
            
            // Animatsiya qo'shildi
            Array.from(dict.results.children).forEach((el, index) => {
                 setTimeout(() => { 
                     el.style.opacity = 1; 
                     el.style.transform = 'translateY(0)'; 
                 }, 50 * index);
            });
        } else {
            dict.results.innerHTML = '<p class="no-results-message">Heshqanday sóz tabılmadı.</p>';
        }
    }


    // --- Navigatsiya Funksiyasi (Menyu tugmasini bosish) ---
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;

            // Barcha faol tugmalarni o'chirish
            document.querySelectorAll('nav a').forEach(nav => nav.classList.remove('active'));
            // Bosilgan tugmani faollashtirish
            e.currentTarget.classList.add('active');
            
            // Barcha bo'limlarni yashirish
            dictionarySections.forEach(section => {
                 section.classList.add('hidden-section');
                 section.classList.remove('active-dictionary');
            });
            
            // Kerakli bo'limni ko'rsatish
            const targetElement = document.getElementById(targetId);
            if(targetElement) {
                targetElement.classList.remove('hidden-section');
                targetElement.classList.add('active-dictionary');
                targetElement.scrollIntoView({ behavior: 'smooth' });
                
                // Agar lug'at bo'limi bo'lsa (axborot bo'limi emas), qidiruv maydonini bo'shatish
                if (targetElement.classList.contains('dictionary-section') && dictionaries[targetId] && dictionaries[targetId].input) {
                    dictionaries[targetId].input.value = '';
                    dictionries[targetId].results.innerHTML = '<p class="initial-message">Izlew nátiyjeleri bul jerde kórinedi.</p>';
                }
            }
        });
    });
    
    // --- Event Listenerlarni ulash ---
    
    // Barcha lug'at fayllarini yuklashni boshlash
    Object.keys(dictionaries).forEach(loadDictionary); 

    // Barcha inputlarga va tugmalarga qidiruv funksiyasini ulash
    Object.keys(dictionaries).forEach(dictKey => {
        const dict = dictionaries[dictKey];
        
        if (dict.input) {
            dict.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch(dictKey);
                }
            });
            // O'zgarish sodir bo'lganda avtomatik qidiruvni faollashtirish (ixtiyoriy)
            // dict.input.addEventListener('input', () => performSearch(dictKey));
        }
        
        if (dict.button) {
            dict.button.addEventListener('click', () => {
                performSearch(dictKey);
            });
        }
    });
});