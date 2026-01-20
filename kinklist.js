var log = function(val, base) {
    return Math.log(val) / Math.log(base);
};
var strToClass = function(str){
    var className = "";
    str = str.toLowerCase();
    var validChars = 'abcdefghijklmnopqrstuvwxyz';
    var newWord = false;
    for(var i = 0; i < str.length; i++) {
        var chr = str[i];
        if(validChars.indexOf(chr) >= 0) {
            if(newWord) chr = chr.toUpperCase();
            className += chr;
            newWord = false;
        }
        else {
            newWord = true;
        }
    }
    return className;
};
var addCssRule = function(selector, rules){
    var sheet = document.styleSheets[0];
    if("insertRule" in sheet) {
        sheet.insertRule(selector + "{" + rules + "}\", 0);
    }
    else if("addRule" in sheet) {
        sheet.addRule(selector, rules, 0);
    }
};

var kinks = {};
var inputKinks = {};
var colors = {};
var level = {};

$(function(){

    $("#listType").change(function() {
        var fileToRead = $("#listType").val() + '.txt';
        $.get(fileToRead, function(data) {
            $('#Kinks').text(data);
            var selection = inputKinks.saveSelection();
            kinks = inputKinks.parseKinksText(data);
            inputKinks.fillInputList();
            inputKinks.restoreSavedSelection(selection);
        }, 'text');
    }); 
    
    inputKinks = {
        $columns: [],
        createCategory: function(name, fields){
            var $category = $('<div class="category"></div>');
            $category.append('<h2>' + name + '</h2>');
            var $table = $('<table><thead><tr></tr></thead><tbody></tbody></table>');
            var $headerRow = $table.find('thead tr');
            $headerRow.append('<th></th>');
            for(var i = 0; i < fields.length; i++) {
                $headerRow.append('<th>' + fields[i] + '</th>');
            }
            $category.append($table);
            return $category;
        },
        createChoice: function(){
            return $('<button class="choice"></button>');
        },
        createKink: function(fields, kink){
            var $kinkRow = $('<tr class="kinkRow"></tr>');
            $kinkRow.data('kink', kink.name);
            var $name = $('<td class="kinkName">' + kink.name + '</td>');
            if(kink.description) {
                $name.append('<span class="kinkDescription">?</span>');
                $name.find('.kinkDescription').on('click', function(){
                    $('#Description').text(kink.description);
                    $('#DescriptionOverlay').fadeIn();
                });
            }
            $kinkRow.append($name);
            
            for(var i = 0; i < fields.length; i++) {
                var $choices = $('<td class="choices"></td>');
                $choices.data('field', fields[i]);
                var colorKeys = Object.keys(colors);
                for(var j = 0; j < colorKeys.length; j++) {
                    var $choice = inputKinks.createChoice();
                    $choice.addClass(colorKeys[j]);
                    $choice.data('level', colorKeys[j]);
                    $choice.data('levelInt', j);
                    $choices.append($choice);
                }
                $choices.find('.choice').on('click', function(){
                    var $this = $(this);
                    if($this.hasClass('selected')) {
                        $this.removeClass('selected');
                    }
                    else {
                        $this.parent().find('.choice').removeClass('selected');
                        $this.addClass('selected');
                    }
                    // Обновляем хеш в URL при каждом клике
                    location.hash = inputKinks.updateHash();
                });
                $kinkRow.append($choices);
            }
            return $kinkRow;
        },
        createColumns: function(){
            inputKinks.$columns = [];
            var numCols = 3;
            if(window.innerWidth < 1100) numCols = 2;
            if(window.innerWidth < 750) numCols = 1;
            for(var i = 0; i < numCols; i++) {
                var $column = $('<div class="column"></div>');
                $column.css('width', (100 / numCols) + '%');
                inputKinks.$columns.push($column);
                $('#InputList').append($column);
            }
        },
        placeCategories: function($categories){
            for(var i = 0; i < $categories.length; i++) {
                var minHeight = 1000000000;
                var minCol = 0;
                for(var c = 0; c < inputKinks.$columns.length; c++) {
                    var height = inputKinks.$columns[c].height();
                    if(height < minHeight) {
                        minHeight = height;
                        minCol = c;
                    }
                }
                inputKinks.$columns[minCol].append($categories[i]);
            }
        },
        fillInputList: function(){
            $('#InputList').empty();
            inputKinks.createColumns();
            var $categories = [];
            var kinkCats = Object.keys(kinks);
            for(var i = 0; i < kinkCats.length; i++) {
                var catName = kinkCats[i];
                var category = kinks[catName];
                var fields = category.fields;
                var kinkArr = category.kinks;
                var $category = inputKinks.createCategory(catName, fields);
                var $tbody = $category.find('tbody');
                for(var k = 0; k < kinkArr.length; k++) {
                    $tbody.append(inputKinks.createKink(fields, kinkArr[k]));
                }
                $categories.push($category);
            }
            inputKinks.placeCategories($categories);
        },
        init: function(){
            inputKinks.fillInputList();
            inputKinks.parseHash();

            // Логика кнопки "Поделиться"
            $('#Share').on('click', function() {
                var hash = inputKinks.updateHash();
                var shareUrl = window.location.origin + window.location.pathname + '#' + hash;
                
                // Попытка копирования через современный API
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareUrl).then(showSuccess);
                } else {
                    // Резервный метод для старых браузеров или http
                    var textArea = document.createElement("textarea");
                    textArea.value = shareUrl;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        showSuccess();
                    } catch (err) {
                        alert('Не удалось скопировать: ' + shareUrl);
                    }
                    document.body.removeChild(textArea);
                }

                function showSuccess() {
                    $('#Loading').text('Ссылка скопирована!').stop().fadeIn().delay(2000).fadeOut();
                }
            });

            $(window).on('resize', function(){
                var selection = inputKinks.saveSelection();
                inputKinks.fillInputList();
                inputKinks.restoreSavedSelection(selection);
            });
        },
        hashChars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.=+*^!@",
        maxPow: function(base, maxVal) {
            var maxPow = 1;
            for(var pow = 1; Math.pow(base, pow) <= maxVal; pow++){ maxPow = pow; }
            return maxPow;
        },
        prefix: function(input, len, char){
            while(input.length < len) { input = char + input; }
            return input;
        },
        encode: function(base, input){
            var hashBase = inputKinks.hashChars.length;
            var outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
            var inputPow = inputKinks.maxPow(base, Math.pow(hashBase, outputPow));
            var output = "";
            var numChunks = Math.ceil(input.length / inputPow);
            var inputIndex = 0;
            for(var chunkId = 0; chunkId < numChunks; chunkId++) {
                var inputIntValue = 0;
                for(var pow = 0; pow < inputPow; pow++) {
                    var inputVal = input[inputIndex++];
                    if(typeof inputVal === "undefined") break;
                    inputIntValue += inputVal * Math.pow(base, pow);
                }
                var outputCharValue = "";
                while(inputIntValue > 0) {
                    var maxPow = Math.floor(log(inputIntValue, hashBase));
                    var powVal = Math.pow(hashBase, maxPow);
                    var charInt = Math.floor(inputIntValue / powVal);
                    outputCharValue += inputKinks.hashChars[charInt];
                    inputIntValue -= charInt * powVal;
                }
                output += inputKinks.prefix(outputCharValue, outputPow, inputKinks.hashChars[0]);
            }
            return output;
        },
        decode: function(base, output){
            var hashBase = inputKinks.hashChars.length;
            var outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
            var values = [];
            var numChunks = Math.max(output.length / outputPow);
            for(var i = 0; i < numChunks; i++){
                var chunk = output.substring(i * outputPow, (i + 1) * outputPow);
                var chunkValues = inputKinks.decodeChunk(base, chunk);
                for(var j = 0; j < chunkValues.length; j++) { values.push(chunkValues[j]); }
            }
            return values;
        },
        decodeChunk: function(base, chunk){
            var hashBase = inputKinks.hashChars.length;
            var outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
            var inputPow = inputKinks.maxPow(base, Math.pow(hashBase, outputPow));
            var chunkInt = 0;
            for(var i = 0; i < chunk.length; i++) {
                var charInt = inputKinks.hashChars.indexOf(chunk[i]);
                chunkInt += Math.pow(hashBase, chunk.length - 1 - i) * charInt;
            }
            var output = [];
            for(var pow = inputPow - 1; pow >= 0; pow--) {
                var posBase = Math.floor(Math.pow(base, pow));
                var posVal = Math.floor(chunkInt / posBase);
                output.push(posVal);
                chunkInt -= posBase * posVal;
            }
            return output.reverse();
        },
        updateHash: function(){
            var hashValues = [];
            $('#InputList .choices').each(function(){
                var lvlInt = $(this).find('.selected').data('levelInt');
                if(typeof lvlInt === "undefined") lvlInt = 0;
                hashValues.push(lvlInt);
            });
            return inputKinks.encode(Object.keys(colors).length, hashValues);
        },
        parseHash: function(){
            var hash = location.hash.substring(1);
            if(hash.length < 5) return;
            var values = inputKinks.decode(Object.keys(colors).length, hash);
            var valueIndex = 0;
            $('#InputList .choices').each(function(){
                var value = values[valueIndex++];
                $(this).children().removeClass('selected').eq(value).addClass('selected');
            });
        },
        saveSelection: function(){
            var selection = [];
            $('.choice.selected').each(function(){
                var $this = $(this);
                var kinkName = $this.closest('tr').data('kink');
                var fieldName = $this.closest('.choices').data('field');
                var levelIdx = $this.data('levelInt');
                selection.push({kink: kinkName, field: fieldName, level: levelIdx});
            });
            return selection;
        },
        restoreSavedSelection: function(selection){
            if(!selection) return;
            for(var i = 0; i < selection.length; i++){
                var item = selection[i];
                var $row = $('.kinkRow').filter(function() { return $(this).data('kink') === item.kink; });
                var $choices = $row.find('.choices').filter(function() { return $(this).data('field') === item.field; });
                $choices.find('.choice').eq(item.level).addClass('selected');
            }
        },
        inputListToText: function(){
            var text = "";
            var kinkCats = Object.keys(kinks);
            for(var i = 0; i < kinkCats.length; i++) {
                text += "#" + kinkCats[i] + "\n";
                var category = kinks[kinkCats[i]];
                text += "(" + category.fields.join(", ") + ")\n";
                for(var k = 0; k < category.kinks.length; k++) {
                    var kink = category.kinks[k];
                    text += "* " + kink.name + "\n";
                    if(kink.description) text += "? " + kink.description + "\n";
                }
                text += "\n";
            }
            return text;
        },
        parseKinksText: function(kinksText){
            var lines = kinksText.split('\n');
            var currentCategory = "";
            var parsedKinks = {};
            for(var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if(line.startsWith('#')) {
                    currentCategory = line.substring(1).trim();
                    parsedKinks[currentCategory] = {fields: [], kinks: []};
                }
                else if(line.startsWith('(')) {
                    var fields = line.substring(1, line.length - 1).split(',');
                    for(var f = 0; f < fields.length; f++) parsedKinks[currentCategory].fields.push(fields[f].trim());
                }
                else if(line.startsWith('*')) {
                    parsedKinks[currentCategory].kinks.push({name: line.substring(1).trim(), description: ""});
                }
                else if(line.startsWith('?')) {
                    var lastKinkIdx = parsedKinks[currentCategory].kinks.length - 1;
                    parsedKinks[currentCategory].kinks[lastKinkIdx].description = line.substring(1).trim();
                }
            }
            return parsedKinks;
        },
        getAllKinks: function(){
            var allKinks = [];
            $('.kinkRow').each(function(){
                var $row = $(this);
                $row.find('.choices').each(function(){
                    allKinks.push({
                        category: $row.closest('.category').find('h2').text(),
                        field: $(this).data('field'),
                        kink: $row.data('kink'),
                        $choices: $(this)
                    });
                });
            });
            return allKinks;
        }
    };

    // Парсим цвета легенды
    $('.legend .choice').each(function(){
        var $this = $(this);
        var color = $this.data('color');
        var className = $this.attr('class').replace('choice ', '');
        colors[className] = color;
        addCssRule('.' + className + '.selected', 'background-color: ' + color + ' !important;');
    });

    // Обработка кнопок интерфейса
    $('#Edit').on('click', function(){
        $('#Kinks').val(inputKinks.inputListToText().trim());
        $('#EditOverlay').fadeIn();
    });

    $('#KinksOK').on('click', function(){
        var selection = inputKinks.saveSelection();
        kinks = inputKinks.parseKinksText($('#Kinks').val());
        inputKinks.fillInputList();
        inputKinks.restoreSavedSelection(selection);
        $('#EditOverlay').fadeOut();
    });

    $('.closePopup, .overlay').on('click', function(e){
        if(e.target !== this) return;
        $('.overlay').fadeOut();
    });

    // Запуск приложения
    kinks = inputKinks.parseKinksText($('#Kinks').val());
    inputKinks.init();

    // Вспомогательный функционал модального окна ввода
    var $popup = $('#InputOverlay');
    var $options = $('#InputValues');
    inputKinks.inputPopup = {
        allKinks: [],
        currentIndex: 0,
        showIndex: function(index){
            inputKinks.inputPopup.currentIndex = index;
            var data = inputKinks.inputPopup.allKinks[index];
            $('#InputCategory').text(data.category);
            $('#InputField').text(data.kink + " (" + data.field + ")");
            
            $options.empty();
            var colorKeys = Object.keys(colors);
            var $selected = data.$choices.find('.selected');
            
            for(var i = 0; i < colorKeys.length; i++){
                var $btn = $('<button class="big-choice"></button>');
                $btn.addClass(colorKeys[i]);
                if($selected.length && $selected.data('level') === colorKeys[i]) $btn.addClass('active');
                
                $btn.on('click', function(){
                    var lvl = $(this).attr('class').split(' ')[1];
                    data.$choices.find('.' + lvl).click();
                    inputKinks.inputPopup.showNext();
                });
                $options.append($btn);
            }
        },
        showNext: function(){
            var index = inputKinks.inputPopup.currentIndex + 1;
            if(index >= inputKinks.inputPopup.allKinks.length) {
                $popup.fadeOut();
                return;
            }
            inputKinks.inputPopup.showIndex(index);
        },
        showPrev: function(){
            var index = inputKinks.inputPopup.currentIndex - 1;
            if(index < 0) return;
            inputKinks.inputPopup.showIndex(index);
        },
        show: function(){
            inputKinks.inputPopup.allKinks = inputKinks.getAllKinks();
            inputKinks.inputPopup.showIndex(0);
            $popup.fadeIn();
        }
    };

    $('#StartBtn').on('click', inputKinks.inputPopup.show);
});
