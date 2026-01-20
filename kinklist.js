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
            var $table = $('<table><thead><tr><th></th></tr></thead><tbody></tbody></table>');
            var $headerRow = $table.find('thead tr');
            for(var i = 0; i < fields.length; i++) {
                $headerRow.append('<th>' + fields[i] + '</th>');
            }
            $category.append($table);
            return $category;
        },
        createChoice: function(){
            var $choices = $('<div class="choices"></div>');
            var i = 0;
            for(var label in colors) {
                var color = colors[label];
                var $choice = $('<button class="choice ' + label + '"></button>');
                $choice.data('level', label);
                $choice.data('levelInt', i++);
                $choice.on('click', function(){
                    var $this = $(this);
                    var isSelected = $this.hasClass('selected');
                    $this.parent().children().removeClass('selected');
                    if(!isSelected) {
                        $this.addClass('selected');
                    }
                    // Обновляем хеш в URL при каждом клике
                    location.hash = inputKinks.updateHash();
                });
                $choices.append($choice);
            }
            return $choices;
        },
        createKink: function(fields, kink){
            var $kink = $('<tr class="kinkRow"></tr>');
            $kink.data('kink', kink.name);
            var $name = $('<td class="kinkName">' + kink.name + '</td>');
            if(kink.description) {
                $name.append('<span class="kinkDescription">?</span>');
                $name.find('.kinkDescription').on('click', function(){
                    $('#Description').text(kink.description);
                    $('#DescriptionOverlay').fadeIn();
                });
            }
            $kink.append($name);
            for(var i = 0; i < fields.length; i++) {
                var $td = $('<td></td>');
                var $choice = inputKinks.createChoice();
                $choice.data('field', fields[i]);
                $td.append($choice);
                $kink.append($td);
            }
            return $kink;
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
            var colHeights = inputKinks.$columns.map(function(){ return 0; });
            for(var i = 0; i < $categories.length; i++) {
                var $cat = $categories[i];
                var shortestCol = 0;
                for(var j = 1; j < colHeights.length; j++) {
                    if(colHeights[j] < colHeights[shortestCol]) shortestCol = j;
                }
                inputKinks.$columns[shortestCol].append($cat);
                colHeights[shortestCol] += $cat.height() || (30 + $cat.find('tr').length * 32);
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
                var $category = inputKinks.createCategory(catName, category.fields);
                var $tbody = $category.find('tbody');
                for(var k = 0; k < category.kinks.length; k++) {
                    $tbody.append(inputKinks.createKink(category.fields, category.kinks[k]));
                }
                $categories.push($category);
            }
            inputKinks.placeCategories($categories);
        },
        init: function(){
            inputKinks.fillInputList();
            inputKinks.parseHash();

            // Кнопка Поделиться
            $('#ShareBtn, #Export').on('click', function() {
                var hash = inputKinks.updateHash();
                var shareUrl = window.location.origin + window.location.pathname + '#' + hash;
                
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareUrl).then(showSuccess);
                } else {
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
                inputKinks.fillInputList();
                inputKinks.parseHash();
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
            for(var chunkId = 0; chunkId < Math.ceil(input.length / inputPow); chunkId++) {
                var inputIntValue = 0;
                for(var pow = 0; pow < inputPow; pow++) {
                    var val = input[chunkId * inputPow + pow];
                    if(val === undefined) break;
                    inputIntValue += val * Math.pow(base, pow);
                }
                var outChunk = "";
                while(inputIntValue > 0) {
                    outChunk = inputKinks.hashChars[inputIntValue % hashBase] + outChunk;
                    inputIntValue = Math.floor(inputIntValue / hashBase);
                }
                output += inputKinks.prefix(outChunk, outputPow, inputKinks.hashChars[0]);
            }
            return output;
        },
        decode: function(base, output){
            var hashBase = inputKinks.hashChars.length;
            var outputPow = inputKinks.maxPow(hashBase, Number.MAX_SAFE_INTEGER);
            var inputPow = inputKinks.maxPow(base, Math.pow(hashBase, outputPow));
            var values = [];
            for(var i = 0; i < output.length / outputPow; i++){
                var chunk = output.substring(i * outputPow, (i + 1) * outputPow);
                var chunkInt = 0;
                for(var j = 0; j < chunk.length; j++) {
                    chunkInt = chunkInt * hashBase + inputKinks.hashChars.indexOf(chunk[j]);
                }
                for(var pow = 0; pow < inputPow; pow++) {
                    values.push(chunkInt % base);
                    chunkInt = Math.floor(chunkInt / base);
                }
            }
            return values;
        },
        updateHash: function(){
            var hashValues = [];
            $('#InputList .choices').each(function(){
                var lvl = $(this).find('.selected').data('levelInt');
                hashValues.push(lvl === undefined ? 5 : lvl); // 5 - это "Не выбрано"
            });
            return inputKinks.encode(6, hashValues);
        },
        parseHash: function(){
            var hash = location.hash.substring(1);
            if(!hash) return;
            var values = inputKinks.decode(6, hash);
            $('#InputList .choices').each(function(i){
                if(values[i] !== undefined && values[i] !== 5) {
                    $(this).find('.choice').eq(values[i]).addClass('selected');
                }
            });
        },
        saveSelection: function(){
            var sel = [];
            $('.choice.selected').each(function(){
                sel.push({
                    kink: $(this).closest('tr').data('kink'),
                    field: $(this).closest('.choices').data('field'),
                    lvl: $(this).data('levelInt')
                });
            });
            return sel;
        },
        restoreSavedSelection: function(sel){
            sel.forEach(function(s){
                $('.kinkRow').filter(function(){ return $(this).data('kink') === s.kink; })
                    .find('.choices').filter(function(){ return $(this).data('field') === s.field; })
                    .find('.choice').eq(s.lvl).addClass('selected');
            });
        },
        parseKinksText: function(text){
            var lines = text.split('\n');
            var result = {};
            var curCat = null;
            for(var i = 0; i < lines.length; i++){
                var line = lines[i].trim();
                if(line.startsWith('#')) {
                    curCat = line.substring(1).trim();
                    result[curCat] = {fields: [], kinks: []};
                } else if(line.startsWith('(')) {
                    result[curCat].fields = line.slice(1,-1).split(',').map(s => s.trim());
                } else if(line.startsWith('*')) {
                    var kink = {name: line.substring(1).trim(), description: ""};
                    if(lines[i+1] && lines[i+1].trim().startsWith('?')) {
                        kink.description = lines[i+1].trim().substring(1).trim();
                    }
                    result[curCat].kinks.push(kink);
                }
            }
            return result;
        },
        inputListToText: function(){
            return $('#Kinks').val();
        }
    };

    // Парсим легенду для цветов
    $('.legend .choice').each(function(){
        var label = $(this).attr('class').split(' ')[1];
        var color = $(this).data('color');
        colors[label] = color;
        level[label] = $(this).next().text();
        addCssRule('.choice.' + label + '.selected', 'background-color:' + color + ' !important');
    });

    // Запуск
    kinks = inputKinks.parseKinksText($('#Kinks').val());
    inputKinks.init();

    // Оверлеи
    $('#Edit').on('click', function(){ $('#EditOverlay').fadeIn(); });
    $('#KinksOK').on('click', function(){
        kinks = inputKinks.parseKinksText($('#Kinks').val());
        inputKinks.fillInputList();
        $('#EditOverlay').fadeOut();
    });
    $('.overlay, .closePopup').on('click', function(e){
        if(e.target === this) $(this).fadeOut();
    });
});
