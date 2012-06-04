var SimulationView = Backbone.View.extend({
    events: {
        'change input':              'viewToModel',
        'change .input_select':      'viewToModel',
        'change .your_class':        'changeClass',
        'click button.reset':        'viewToModel'
    },

    initialize: function() {
        _.bindAll(this);
        
        updateBreadcrumb("calculator");

        this.template = _.template($('#simulation-template').html());
    },

    viewToModel: function() {
        _.each(this.model.getAllOptions(), function(optionInfo, optionName) {
            var selector = generateSelector(optionName);
            var $fieldObj = $(selector,  this.el);

            if ($fieldObj.is('span') || $fieldObj.is('td')) {
                // --
            } else if ($fieldObj.is('input') && $fieldObj.prop('type') == 'checkbox') {
                this.model.set(optionName, !!$fieldObj.prop('checked'));
            } else if ($fieldObj.is('input') && $fieldObj.prop('type') == 'text' && !$fieldObj.prop('readonly')) {
                var val = $fieldObj.val();
                    val = $fieldObj.hasClass('plain') ? val : normalizeFloat(val, optionName);
                
                this.model.set(optionName, val);
            } else if ($fieldObj.is('select') && !$fieldObj.prop('readonly')) {
                this.model.set(optionName, $fieldObj.val());
            }
        }, this);

        this.model.save();
    },
    
    renderOptionRow: function($parent, optionInfo, optionName) {
        optionInfo['type']  = optionInfo['type']  || 'checkbox';
        optionInfo['title'] = optionInfo['title'] || "[" + optionName + "]";
        optionInfo['alt']   = optionInfo['alt']   || "";
        
        var $row, $col1, $col2, $col3, $input, $alt;
        
        $row = $('<tr />')
                    .appendTo($parent);
        $col1 = $('<th />')
                    .append($('<span />').html(optionInfo['title']).attr('title', optionInfo['alt']))
                    .appendTo($row);
        $col2 = $('<td />')
                    .appendTo($row);
        $col3 = $('<td />')
                    .appendTo($row);
        
        if (optionInfo['type'] == 'checkbox') {
            $input = $('<input type="checkbox" />')
                        .addClass(optionName);
        } else if (optionInfo['type'] == 'select') {
            seloptions = optionInfo['options'] || {};
            
            if (typeof seloptions == 'function') {
                seloptions = seloptions();
            }
            
            $input = $('<select />')
                        .addClass('form-inline input-medium')
                        .addClass(optionName);
            
            _.each(seloptions, function(val, key) {
               $input.append($('<option />').val(key).html(val)); 
            });
        } else if (optionInfo['type'] == 'text') {
            $input = $('<input type="text" />')
                        .addClass('form-inline input-medium')
                        .addClass(typeof(optionInfo['plain']) != 'undefined' ? 'plain' : '')
                        .addClass(optionName);
        }
        
        $input.appendTo($col2);
        
        if (typeof(optionInfo['tip']) != 'undefined') {
            $('<span />')
                .attr('title', optionInfo['tip'])
                .addClass('label label-info')
                .html("?")
                .appendTo($col2)
                .tooltip();
        }                
        
        if (typeof(optionInfo['alternative']) != 'undefined') {
            if (typeof optionInfo['alternative'] == 'boolean') {
                $alt = $col3;
            } else {
                $alt = $('<strong />').html("+"+optionInfo['alternative']+" "+optionInfo['title']+"<br />").appendTo($col3);
                $alt = $('<span />');
            }

            $alt.addClass(optionName + "_alt_ehp");
            
            _.each(['magic_only', 'melee_only', 'ranged_only', 'dodge_only', 'elite_only'], function(x_only) {
                if (typeof(optionInfo[x_only]) != 'undefined') {
                    $alt.addClass(x_only);                        
                }
            });
            
            if ($alt != $col3) {
                $alt.appendTo($col3);
            }
        }
    },
    
    renderOptions: function() {        
        _.each({
            '#base_options tbody':  this.model.base_options,
            '#options tbody':       this.model.options,
            '#extra_options tbody': this.model.extra_options
        }, function(options, parent) {
            var $parent = $(parent, this.el);
            
            if (!$parent) {
                return;
            }
            
            $parent.empty();
            
            _.each(options, function(optionInfo, optionName) { 
                this.renderOptionRow($parent, optionInfo, optionName); 
            }, this);
        }, this);
    },

    modelToView: function() {
        var alternatives = {};
        
        var toField = _.bind(function($fieldObj, selector, fieldName, fieldValue) {
            if ($fieldObj.is('span') || $fieldObj.is('td')) {
                $fieldObj.html(this.prepareVal(fieldValue, fieldName));
            } else if ($fieldObj.is('input') && $fieldObj.prop('type') == 'checkbox') {
                $fieldObj.prop('checked', !!fieldValue);
            } else if ($fieldObj.is('input') && $fieldObj.prop('type') == 'text') {
                fieldValue = $fieldObj.hasClass('plain') ? fieldValue : this.prepareVal(fieldValue, fieldName);
                
                $fieldObj.val(fieldValue);
            } else if ($fieldObj.is('select')) {
                $fieldObj.val(fieldValue);
            }
        }, this);
        
        _.each(this.model.getAllOptions(), function(optionInfo, optionName) {
            var selector = generateSelector(optionName);
            var $fieldObj = $(selector,  this.el);

            toField($fieldObj, selector, optionName, this.model.get(optionName));
            
            if (typeof(optionInfo['alternative']) != 'undefined') {
                if (typeof optionInfo['alternative'] == 'boolean') {
                    alternatives[optionName] = [{/* this should contain stat changes */}, !this.model.get(optionName)];
                    alternatives[optionName][0][optionName] = !this.model.get(optionName);
                } else {
                    alternatives[optionName] = [{/* this should contain stat changes */}, true];
                    alternatives[optionName][0][optionName] = this.model.get(optionName) + optionInfo['alternative'];
                }
            }            
        }, this);
        
        _.each(['life', 'armor', 'armor_reduc', 'resist', 'resist_reduc'], function(buffed_stats_field) {
            var selector = generateSelector(buffed_stats_field);
            var $fieldObj = $(selector,  this.el);

            toField($fieldObj, selector, buffed_stats_field, this.model.get(buffed_stats_field));
        }, this);
        
        _.each(['ehp', 'ehp_dodge', 'ehp_melee', 'ehp_dodge_melee', 'ehp_ranged', 'ehp_dodge_ranged', 'ehp_magic', 'ehp_dodge_magic', 'ehp_elite', 'ehp_dodge_elite'], function(ehp_field) {
            var selector = generateSelector(ehp_field);
            var $fieldObj = $(selector,  this.el);

            toField($fieldObj, selector, ehp_field, this.model.get(ehp_field));
        }, this);
        
        _.each(alternatives, function(alt, alt_field) {
            var alt_stats   = alt[0];
            var reltosource = alt[1];
            var selector    = generateSelector(alt_field + "_alt_ehp");
            var alt_model   = this.model.clone();
            
            alt_model.set(alt_stats);

            var alt_ehp_title = 'EHP', alt_ehp_field = 'ehp';

            if($(selector, this.el).hasClass('melee_only')) {
                alt_ehp_title = "EHP melee";
                alt_ehp_field = "ehp_melee";
            } else if($(selector, this.el).hasClass('ranged_only')) {
                alt_ehp_title = "EHP ranged";
                alt_ehp_field = "ehp_ranged";
            } else if($(selector, this.el).hasClass('magic_only')) {
                alt_ehp_title = "EHP magic";
                alt_ehp_field = "ehp_magic";
            } else if($(selector, this.el).hasClass('dodge_only')) {
                alt_ehp_title = "EHP dodge";
                alt_ehp_field = "ehp_dodge";
            } else if($(selector, this.el).hasClass('elite_only')) {
                alt_ehp_title = "EHP elite";
                alt_ehp_field = "ehp_elite";
            }
            
            var ehp     = this.model.get(alt_ehp_field);
            var alt_ehp = alt_model.get(alt_ehp_field);
            
            var ehp_change   = alt_ehp - ehp;
            var ehp_change_p = (ehp_change / (reltosource ? ehp : alt_ehp));

            ehp_change   = (ehp_change   > 0) ? ("+" + this.prepareVal(ehp_change, '', 0))  : this.prepareVal(ehp_change, '', 0);
            ehp_change_p = (ehp_change_p > 0) ? ("+" + this.prepareVal(ehp_change_p, '%'))  : this.prepareVal(ehp_change_p, '%');
            
            var html = "" + ehp_change + " " + alt_ehp_title + "; " + ehp_change_p;
            
            $(selector, this.el).html(html);
        }, this);
    },

    changeClass: function() {
        classname = $('.your_class', this.el).val();

        newModel = this.model = CharacterList.getModelByClass(classname);
        CharacterList.add(newModel);
        
        this.renderClass();
    },
    
    renderClass: function() {
        this.model.on('change', this.modelToView, this);
        
        this.renderOptions();
        this.modelToView();
        $(".auto_tooltip").tooltip();
        
        if (gahandler) {
            gahandler.changeClass(this.model.get('your_class'));
        }
        
    },

    prepareVal: function(val, field, dec) {
        if (field == 'armor_reduc' || field == 'resist_reduc' || field == '%') {
            dec = dec != undefined ? dec : 2;
            
            val *= 100;
            val = this.roundNumber(val, dec);
            val = ""+val+"%";
            
            return val;
        } else {
            dec = dec != undefined ? dec : 2;
            return this.roundNumber(val, dec);
        }
    },

    roundNumber: function(num, dec) {
        return Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
    },

    render: function() {
        $(this.template()).appendTo($(this.el));

        var $classSelect = $('.your_class', this.el);
        $classSelect.children().remove();

        _.each(classlist, function(info, shortname) {
            $('<option />').val(shortname).html(info[1]).appendTo($classSelect);
        }, this);

        if (this.model) {
            $classSelect.val(this.model.get('your_class'));
            this.renderClass();
        } else {
            this.changeClass();
        }

        $("#dodge_ehp_explained").tooltip({
            title: "<strong>keep in mind; dodge is random.</strong><br />" +
                   "In normal EHP calculations it's excluded since if you get unlucky you will have 0 dodges before your health pool is empty!"
        });
    }
});
