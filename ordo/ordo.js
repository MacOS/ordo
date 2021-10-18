define([
    'require',
    'jquery',
    'base/js/namespace',
    'base/js/events',
    'base/js/dialog',
    'notebook/js/celltoolbar'
],  function(
    require,
    $,
    Jupyter,
    events,
    dialog,
    celltoolbar
) {

    console.debug("...Ordo loaded... grading capabilities initiated");

    var defaultSuccess = "";
    var defaultFailure = "";

    /* Taken from https://github.com/ipython-contrib/jupyter_contrib_nbextensions/issues/664 */
    /* 
    var all_events = [
        'app_initialized.DashboardApp',
        'app_initialized.NotebookApp',
        'autosave_disabled.Notebook',
        'autosave_enabled.Notebook',
        'before_save.Notebook',
        'changed',
        'checkpoint_created.Notebook',
        'checkpoint_delete_failed.Notebook',
        'checkpoint_deleted.Notebook',
        'checkpoint_failed.Notebook',
        'checkpoint_restore_failed.Notebook',
        'checkpoint_restored.Notebook',
        'checkpoints_listed.Notebook',
        'collapse_pager',
        'command_mode.Cell',
        'command_mode.Notebook',
        'config_changed.Editor',
        'create.Cell',
        'delete.Cell',
        'draw_notebook_list.NotebookList',
        'edit_mode.Cell',
        'edit_mode.Notebook',
        'execute.CodeCell',
        'finished_execute.CodeCell',
        'execution_request.Kernel',
        'expand_pager',
        'file_load_failed.Editor',
        'file_loaded.Editor',
        'file_renamed.Editor',
        'file_saved.Editor',
        'file_saving.Editor',
        'input_reply.Kernel',
        'kernel_autorestarting.Kernel',
        'kernel_busy.Kernel',
        'kernel_connected.Kernel',
        'kernel_connection_dead.Kernel',
        'kernel_connection_failed.Kernel',
        'kernel_created.Kernel',
        'kernel_created.Session',
        'kernel_dead.Kernel',
        'kernel_dead.Session',
        'kernel_disconnected.Kernel',
        'kernel_idle.Kernel',
        'kernel_interrupting.Kernel',
        'kernel_killed.Kernel',
        'kernel_killed.Session',
        'kernel_ready.Kernel',
        'kernel_reconnecting.Kernel',
        'kernel_restarting.Kernel',
        'kernel_starting.Kernel',
        'kernelspecs_loaded.KernelSpec',
        'list_checkpoints_failed.Notebook',
        'mode_changed.Editor',
        'no_kernel.Kernel',
        'notebook_copy_failed',
        'notebook_deleted.NotebookList',
        'notebook_load_failed.Notebook',
        'notebook_loaded.Notebook',
        'notebook_loading.Notebook',
        'notebook_read_only.Notebook',
        'notebook_renamed.Notebook',
        'notebook_restoring.Notebook',
        'notebook_save_failed.Notebook',
        'notebook_saved.Notebook',
        'open_with_text.Pager',
        'output_appended.OutputArea',
        'preset_activated.CellToolbar',
        'preset_added.CellToolbar',
        'rebuild.QuickHelp',
        'received_unsolicited_message.Kernel',
        'rendered.MarkdownCell',
        'resize',
        'resize-header.Page',
        'save_status_clean.Editor',
        'save_status_dirty.Editor',
        'select.Cell',
        'selected_cell_type_changed.Notebook',
        'send_input_reply.Kernel',
        'sessions_loaded.Dashboard',
        'set_dirty.Notebook',
        'set_next_input.Notebook',
        'shell_reply.Kernel',
        'spec_changed.Kernel',
        'spec_match_found.Kernel',
        'spec_not_found.Kernel',
        'trust_changed.Notebook',
        'unrecognized_cell.Cell',
        'unrecognized_output.OutputArea',
        'unregistered_preset.CellToolbar',
    ];


    events.on(all_events.join(' '), function (evt, data) {
        console.debug('[evt]', evt.type, (new Date()).toISOString(), data);
    });
    */

    var params = {
        defaultSuccess     : "",
        defaultFailure     : "",
        enableModeToggle   : true
    };


    /**
     * Does all the init work of ordo
     */
    var initialize = function () {

        $('<link/>')
            .attr({
                rel: 'stylesheet',
                type: 'text/css',
                href: require.toUrl('./ordo.css')
            })
            .appendTo('head');


        events.on("notebook_loaded.Notebook", function() {
            initializeCells()
        });



        if (Jupyter.notebook !== undefined && Jupyter.notebook._fully_loaded) {
            initializeCells();
        }


        ordoFeedback();
        makeOutputButton();
        showSolutionButton();
        editMetadataButtons();


        /* The default is feedback mode ... */
        $('.command_mode').addClass('ordo_feedback_mode');

        if (params.enableModeToggle) {

            /* TODO: Remove toggle button, eventually */
            
            ordoEditFeedbackToggle();

            celltoolbar.CellToolbar.register_callback('create_tutorial.toolbar', createCellToolbar);
            
                var preset = ['create_tutorial.toolbar'];
            
                celltoolbar.CellToolbar.register_preset('Create Tutorial', preset, Jupyter.notebook);
        }

    };



    /**
     * Toggels the admonition div between the states open and close
     * @param {object} cell Jupyter notebooks' cell object
     * @param {object} btn A JQuery object that represents a HTML button
     */
    var onClickAdmonitionButton = function(cell, btn) {
        console.debug(btn);

        if (btn.hasClass('active')) {
            console.debug("Close ...");
            
            cell.element.find('div.ordo-admonition-controls').nextAll().hide();
            btn.text('Open');
        } else {
            console.debug("Open ...");

            cell.element.find('div.ordo-admonition-controls').nextAll().show();
            btn.text('Close');
        }
    };



    /**
     * Creates and appends the ordo div with tits button to the given cell
     * @param {object} cell Jupyter notebooks' cell object
     */
    var toggleOpenButton = function(cell) {
        console.debug("toggleOpenButton");
        console.debug(cell);
        
        if (cell.metadata.ordo !== undefined &&
            cell.metadata.ordo.admonition !== undefined &&
            cell.metadata.ordo.admonition) {

            var ordoDiv = $('<div />')
                .addClass("text-center")
                .addClass('ordo-admonition-controls');
            
            var btn = $('<button />')
                .addClass('btn btn-sm btn-primary ordo-admonition-btn')
                .attr('data-toggle', 'button');


            /*
                Make sure that the magic happens when the DOM sub-structure
                of a given admonition cell has been fully loaded
            */
            
            cell.element.ready(function() {
                if (params.enableModeToggle) {
                    btn.addClass('active').attr('aria-pressed', true);
                    cell.element.find('div.ordo-admonition-controls').nextAll().show();
                    btn.text('Close');
                } else {
                    btn.attr('aria-pressed', false);
                    cell.element.find('div.ordo-admonition-controls').nextAll().hide();
                    btn.text('Open');
                }
            });


            btn.click(function() { onClickAdmonitionButton(cell,$(this)) });
            
            cell.element.prepend(ordoDiv.append(btn));
        } else {
            cell.element.find('div.ordo-admonition-controls').remove();
        }
    };


    /**
     * Creates and adds the ordo cell toolbar to the given cell
     * @param {*} div 
     * @param {*} cell 
     * @param {*} celltoolbar 
     */
    var createCellToolbar = function (div, cell, celltoolbar) {

        var ordoDiv = $('<div />').addClass('ordo-celltoolbar');


        /* Authoring */
        if (cell.cell_type === null) {
            
            events.on('create.Cell', (event, _) => {
                events.off(event);
                createCellToolbar(div, cell, celltoolbar);
            });

        } else {

            if (cell.cell_type === 'code') {
                var editSolBtn = $('<button />')
                    .addClass('btn btn-sm btn-secondary')
                    .text('Add solution')
                    .click((evt) => onEditSol(cell));

                if (cell.metadata.ordo_solution !== undefined) {
                    editSolBtn.text('Edit solution');
                }
                
                var editSuccBtn = $('<button />')
                    .addClass('btn btn-sm btn-secondary')
                    .text('Edit success message')
                    .click((evt) => onEditSuccMsg(cell));
                
                var editFailBtn = $('<button />')
                    .addClass('btn btn-sm btn-secondary')
                    .text('Edit failure message')
                    .click((evt) => onEditFailMsg(cell));;
                
                
                var authGrp = $('<div/>')
                    .addClass('btn-group')
                    .attr('role', 'group')
                    .attr('aria-label', 'Buttons for authoring cell solutions');
                

                authGrp.append(editSolBtn).append(editSuccBtn).append(editFailBtn);
                
                ordoDiv.append(authGrp);
            }



            /* Admonition */
            var adm = $('<button />')
                .addClass('btn btn-sm btn-secondary ordo-admonition')
                .attr('data-toggle', 'button')
                .attr('aria-pressed', false)
                .text('Make admonition');

            if (cell.metadata.ordo !== undefined &&
                cell.metadata.ordo.admonition !== undefined &&
                cell.metadata.ordo.admonition) {
                adm.addClass('active').attr('aria-pressed', true);
            }
            

            adm.click(() => {
            
                if (cell.metadata.ordo === undefined) {
                    cell.metadata.ordo = {};
                }
                
                if (cell.metadata.ordo.admonition === undefined) {
                    cell.metadata.ordo.admonition = true;
                    cell.element.addClass('ordo-admonition-on');
                    cell.element.find('button.ordo-admonition').text('Delete admonition');
                } else {
                    delete cell.metadata.ordo.admonition;
                    cell.element.removeClass('ordo-admonition-on');
                    cell.element.find('button.ordo-admonition').text('Make admonition');
                }

                toggleOpenButton(cell);
                
            });

            
            $(div).append(ordoDiv.append(adm));
        }
    };


    /**
     * Adds ordo UI to all cells
     */
    var initializeCells = function() {

        Jupyter.notebook.get_cells().forEach(function (cell, idx, cells) {
            console.debug("initializeCells");
            console.debug(cell.metadata);

            toggleOpenButton(cell);
        });
    };


    /**
     * reads and sets configuration properties, which contains the default messages
     * for failure and success
     */
    var readConfig = function() {

        $.extend(true, params, Jupyter.notebook.config.data.ordo);
        console.debug(params);

        /* FIXME: for the time being, set old variables */
        defaultFailure = params['defaultFailure'];
        defaultSuccess = params['defaultSuccess'];
    };


    /**
     * Sends python code to the kernel for excecution and returns the result
     * @param {*} python 
     * @returns {*} The result of the excecution
     */
    var executePython = function(python) {
        console.debug("define: ", python);

        result = new Promise((resolve, reject) => {
            console.debug("Promise Python:", python);

            Jupyter.notebook.kernel.execute(
                python, {
                    iopub: {
                        output: (msg) => {
                            console.debug("CALLBACK: ", msg);

                            /* TODO: Fix for error cases, check for status == error etc. */
                            if (msg.msg_type === 'execute_result') {
                                console.debug("CALLBACK (result): ", solutionToString(msg.content.data));

                                resolve(msg.content.data);
                            }
                        }
                    }
                },
                {silent: false}
            );
        }).then((result) => {
            console.debug("Promise result ", result);

            return result;
        });

        return result;
    };



    /**
     * executes the solution upon the event finished_execute.CodeCell and appends the result
     * to the output area called
     * @param {object} evt the event finished_execute.CodeCell. not used withing the function
     * @param {object} obj an objectwhich provides access to the cell via property cell
     */
    var onCodeCellExecuted = async function(evt, obj) {
        outputs = obj.cell.output_area.outputs;
        solution = obj.cell.metadata.ordo_solution;
        
        if (solution !== undefined) {
            console.debug("ordo feedback ?", obj.cell.element.find('.output_area'));

            if (obj.cell.metadata.ordo_verify === undefined) {
                var res;

                if (solution['python'] !== undefined) {
                    console.debug("executePython AWAIT ", solution);
                    
                    res = await executePython(solution["python"]).then((result) => { console.debug("3. executePython", result); return result })
                    obj.cell.metadata.ordo_solution = {...obj.cell.metadata.ordo_solution, ...res};
                    
                    
                } else {
                    res = solution;
                }

                console.debug("executePython SOL xxxxx: ", res, outputs, outputs[outputs.length-1]);
                feedback = ordoFeedbackMessage(
                    equals(res, outputs[outputs.length-1].data),
                    obj.cell.metadata.ordo_success, 
                    obj.cell.metadata.ordo_failure);
            } else {
                if(solution['python'] != undefined) {
                    console.debug("executePython AWAIT ",  solution);
                    
                    solution = await executePython(solution["python"]).then((result) => console.debug("3. executePython2" + result))
                } 
            
                console.debug("executePython SOL 2 ", solution);
                feedback = obj.cell.metadata.ordo_verify(
                    outputs[outputs.length-1].data, 
                    obj.cell.metadata.ordo_success, 
                    obj.cell.metadata.ordo_failure);
            }

            obj.cell.output_area.append_output({
                "output_type" : "display_data",
                "data" : {
                    "text/html": feedback
                },
                "metadata" : {}
            });
        }
    };
    
    /**
     * registers function onCodeCellExecuted to event finished_execute.CodeCell. This function is hence
     * called after the current code cell is executed
     */
    var ordoFeedback = function () {
        events.on('finished_execute.CodeCell', onCodeCellExecuted);
    };

    /**
     * returns the feedback div.
     * @param {boolean} correct - indicates if the solution was correct or not
     * @param {string} success_msg - the success message for the current cell, if defined
     * @param {string} failure_msg - the failure message for the current cell, if defined
     * @returns {string} the feedback div container as a string 
     */
    var ordoFeedbackMessage =  function(correct, success_msg, failure_msg) {
        if(correct) {
            if (success_msg == undefined && defaultSuccess == "") {
                feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
                                "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
                                "<strong>Well Done!</strong> That was the correct response. " + 
                            "</div>";

                return feedback;
            }

            if (success_msg == undefined && defaultSuccess) {
                feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
                                "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
                                defaultSuccess +
                            "</div>"

                return feedback;
            }

            feedback = "<div class='alert alert-success alert-dismissible ordo_feedback' role='alert'> " + 
            "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
            success_msg +
            "</div>"

            return feedback;
        }


        /*
        Solution was wrong.
        */

        if (failure_msg == undefined) {
            feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'> " + 
                            "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
                            "<strong>Oh no!</strong> That wasn't quite right. " + 
                        "</div>"

            return feedback;
        }

        if (failure_msg == undefined && defaultFailure) {
            feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'> " +
                            "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
                            defaultFailure + 
                        "</div>"

            return feedback;
        }

        feedback = "<div class='alert alert-danger alert-dismissible ordo_feedback' role='alert'>" + 
                        "<button type='button' class='close' data-dismiss='alert'>&times;</button>" + 
                        failure_msg  + 
                    "</div>"

        return feedback;
    };


	/**
	 * tests two metadata objects for equality
	 * @param {Object} obj1 
	 * @param {Object} obj2 
	 */
	var equals = function(obj1, obj2) {
		for(var p in obj1){
			if(obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;
			switch(typeof(obj1[p])) {
				case 'object':
					if(!equals(obj1[p],obj2[p])) return false;
					break;
				case 'function':
					if(typeof(obj2[p]) == undefined || (p != equals && obj1[p].toString() != obj2[p].toString())) return false;
					break;
				default:
					if(obj1[p] != obj2[p]) return false;
			}
		}
		for(var p in obj2) {
			if(typeof(obj1[p]) == undefined) return false;
		}
		return true;
	};


    /** 
     *  Capture select cell event for the cell data
     *  check cell type is code
     *  if true:
     *    check the cell is the same as the formerly selected cell
     *    if true:
     *      return with no action
     *    if false:
     *      Remove the button from the formerly selected cell
     *      check if the cell has been run already
     *      if true:
     *        append a button for the user to click which will:
     *        make ordo_solution = output_area.outputs[0]
     */
    var makeOutputButton = function () {

        events.on('select.Cell', function(event, data) {
            newCell = data.cell;

            if(data.cell == undefined) {
                return;
            }

            if($('.ordo_edit_mode').length == 0) {
                return;
            }


            $(".show-ordo-solution").remove();
            $(".make-ordo-solution").remove();

            if(data.cell.cell_type == "code") {
                if(data.cell.output_area.outputs.length > 0){
                    if(data.cell.output_area.outputs[0].output_type == "execute_result") {
                        $(".selected .output_area")
                            .first()
                            .append("<button type='button' class='btn btn-primary make-ordo-solution'>make solution</button>");


                        $(".make-ordo-solution").on("click", function() {
                            console.debug("updated metadata");
                            data.cell.metadata.ordo_solution = data.cell.output_area.outputs[0].data;
                        });
                    }
                }
            }
        });
    };

    /**
     * returns the solution as a string for display purposes. this is used when the user clicks on
     * Edit Solutions
     * @param {Object} solution
     * @returns {String} solution 
     */
    var solutionToString = function(solution) {

        /* TODO: change to "text/x-..." later */
        var acceptedMimeTypes = ["python", "text/html", "text/plain"];


        var mimeTypes = Object.keys(solution);
        console.debug("mimeTypes", mimeTypes);


        for(acceptedMimeType in acceptedMimeTypes) {
            if (mimeTypes.includes(acceptedMimeType)) {
                outStr = solution[acceptedMimeType];
                console.debug(outStr);
                return outStr;
            }
        }

        return null;
    };


    /**
     * 
     * creates and appends a button to show the current solution to the user.
     */
    var showSolutionButton = function () {

        events.on('select.Cell', function(event, data) {

            if(data.cell == undefined){
                return;
            }
            
            if($('.ordo_feedback_mode').length == 0) {
                return;
            }


            $(".show-ordo-solution").remove();


            if(data.cell.cell_type === "code" && data.cell.metadata && data.cell.metadata.ordo_solution) {
                
                if(data.cell.output_area.outputs.length > 0) {
                    console.debug("Show solution button");
                    console.debug(data.cell.output_area.outputs[0].output_type);

                    if(["execute_result", "stream"].includes(data.cell.output_area.outputs[0].output_type)) {
                        $(".selected .input")
                            .after("<div style='text-align: right;'><button type='button' class='btn fa fa-eye show-ordo-solution'></button></div>");
                        
                        $(".show-ordo-solution").one("click", function() {
                            console.debug(data.cell.metadata.ordo_solution);

                            /* TODO: 
                            * - Improve retrieval here based on a parametric solutionToString 
                            * - Make sure that we escape text/plain content here, as feedback requires markup!
                            */
                            
                            solution = data.cell.metadata.ordo_solution['text/plain'];
                            console.debug("Current solution => " + solution);
                            
                            feedback = "<div class='alert alert-info alert-dismissible show-ordo-solution' role='alert'>" + 
                                        "<button type='button' class='close' data-dismiss='alert'>&times;</button> " + 
                                        "<stron> Expected solution is: </strong>" + solution  + " </div>";
                            
                            currCell.output_area.append_output({
                                "output_type" : "display_data",
                                "data" : {
                                    "text/html": feedback
                                },
                                "metadata" : {}
                            });
                        });
                    }
                }
            }
        }); 
    };
    


    /**
     * Sets the solution of each cell to the output of the cell.
     */
    var allOutputsButton = function() {

        var setAllCellOutputsAsCellSolutions = function () {

            for(i=0; i < Jupyter.notebook.get_cells().length; i++) {

                if(cells[i].cell_type == "code") {
                    
                    if(cells[i].output_area != undefined) {

                        if(cells[i].output_area.outputs.length > 0) {

                            if(cells[i].output_area.outputs[0].output_type == "execute_result") {
                                cells[i].metadata.ordo_solution = cells[i].output_area.outputs[0].data;
                                console.debug("updated metadata");
                            }
                        }
                    }
                }
            }
        };


        var action = {
            icon: 'fa-lightbulb-o',
            help: 'Make all outputs solutions',
            help_index: 'zz',
            handler: setAllCellOutputsAsCellSolutions
        };
        

        var prefix = 'allOutputsButton';
        var action_name = 'show-button';
        var full_action_name = Jupyter.actions.register(action, action_name, prefix);
        

        if($("[data-jupyter-action*='allOutputsButton']").length == 0) {
            Jupyter.toolbar.add_buttons_group([full_action_name]);
        }
    };



    /**
     * toggles the cell mode between editing/creating solutions and giving feedback
     */
    var ordoEditFeedbackToggle = function() {
        var editMode = function() {
            $('.command_mode').removeClass('ordo_feedback_mode');
            $('.command_mode').addClass('ordo_edit_mode');
            $("[data-jupyter-action*='feedbackToggle']").removeClass('active');
            $("[data-jupyter-action*='editModeToggle']").addClass('active');
            makeOutputButton();
            allOutputsButton();
        };

        var eMaction = {
            icon: 'fa-pencil',
            help: 'Enter ordo-edit mode',
            help_index: 'zy',
            handler: editMode
        };


        var eMprefix = 'editModeToggle';
        var eMaction_name = 'EnterEditMode';
        var eM_action_name = Jupyter.actions.register(eMaction, eMaction_name, eMprefix);




        var feedbackMode = function() {
            $('.command_mode').removeClass('ordo_edit_mode');
            $('.command_mode').addClass('ordo_feedback_mode');
            $("[data-jupyter-action*='editModeToggle']").removeClass('active');
            $("[data-jupyter-action*='feedbackToggle']").addClass('active');
            $("[data-jupyter-action*='allOutputsButton']").remove();
            $(".make-ordo-solution").remove();
            $(".ordo-user-input").remove();
        };


        var fMaction = {
            icon: 'fa-check',
            help: 'Enter feedback-only mode',
            help_index: 'zx',
            handler: feedbackMode
        };


        var fMprefix = 'feedbackToggle';
        var fMaction_name = 'EnterFeedbackMode';
        var fM_action_name = Jupyter.actions.register(fMaction, fMaction_name, fMprefix);



        var toggleAdmonitions = function() {
            var r = $("[data-jupyter-action*='toggleAdmonitions']").toggleClass('active');
            console.debug("toggleAdmonitions 'em!!!!");
            

            Jupyter.notebook.get_cells().forEach(function (cell, idx, cells) {

                if (r.hasClass('active')) {
                    var elem = cell.element.find("div.ordo-admonition-controls button.ordo-admonition-btn.active");
                } else {
                    var elem = cell.element.find("div.ordo-admonition-controls :not(button.ordo-admonition-btn.active)");
                }
                
                if (elem.length > 0) {
                    onClickAdmonitionButton(cell, elem);
                    elem.toggleClass("active");
                }
            });
        };

        var admAction = {
            icon: 'fa-window-close-o',
            help: 'Open/ close all admonitions cells',
            help_index: 'zz',
            handler: toggleAdmonitions
        };

        var admPrefix = 'toggleAdmonitions';
        var admAction_name = 'OpenCloseAdmonitions';
        var adm_action_name = Jupyter.actions.register(admAction, admAction_name, admPrefix);
        
        Jupyter.toolbar.add_buttons_group([fM_action_name, eM_action_name, adm_action_name]);

        $("[data-jupyter-action*='feedbackToggle']").addClass('active');
    };


    /**
     * Invokes the edit solution modal for a given cell
     * @param {object} A jupyter notebook cell object
     */
    var onEditSol = function(cell) {
        dialog.modal({
            'title': 'Edit Solutions',
            'body': makeSolutionInputArea(cell),
            'buttons': {
                'Cancel': {},
                'Save New Solution': {
                    'id': 'save-solution-btn',
                    'class': 'btn-primary',
                    'click': function() {
                        sol = {};
                        sol[$('#output_type').val()] = $('#solution_text_area').val();
                        cell.metadata.ordo_solution = sol;
                    }
                },
                'Remove Solution': {
                    'id': 'remove-solution-btn',
                    'class': 'btn-danger',
                    'click': function() {
                        delete cell.metadata.ordo_solution;
                    }
                }
            },
            'keyboard_manager': Jupyter.notebook.keyboard_manager,
            'notebook': Jupyter.notebook
        });
    };



    /**
     * Invokes the edit success message modal for a given cell
     * @param {object} A jupyter notebook cell object
     */
    var onEditSuccMsg = function(cell) {
        dialog.modal({
            'title': 'Edit Success Messages',
            'body': makeMessageInputArea(cell),
            'buttons': {
                'Cancel': {},
                'Save New Message': {
                    'id': 'save-success-msg-btn',
                    'class': 'btn-primary',
                    'click': function() {
                        if($('#styling').val() == "bold") {
                            sol = "<b>" + $('#message_text_area').val() + "</b>";
                        } else {
                            sol = $('#message_text_area').val();
                        }
                        
                        cell.metadata.ordo_success = sol;
                    }
                },
            },
            'keyboard_manager': Jupyter.notebook.keyboard_manager,
            'notebook': Jupyter.notebook
        })
    };



    /**
     * Invokes the edit fail message modal for a given cell
     * @param {object} A jupyter notebook cell object
     */
    var onEditFailMsg = function(cell) {
        dialog.modal({
            'title': 'Edit Failure Message',
            'body': makeMessageInputArea(cell),
            'buttons': {
                'Cancel': {},
                'Save New Message': {
                    'id': 'save-failure-msg-btn',
                    'class': 'btn-primary',
                    'click': function() {
                        if($('#styling').val() == "bold") {
                            sol = "<b>" + $('#message_text_area').val() + "</b>";
                        } else {
                            sol = $('#message_text_area').val();
                        }

                        cell.metadata.ordo_failure = sol;
                    }
                },
            },
            'keyboard_manager': Jupyter.notebook.keyboard_manager,
            'notebook': Jupyter.notebook
        })
    };
    
    
    /**
     * creates the buttons and handles the functionality related to editing a solution
     */
    var editMetadataButtons = function() {
        
        events.on('select.Cell', function(event, data) {
            
            if(data.cell == undefined){
                return;
            }
            
            if($('.ordo_edit_mode').length == 0) {
                return;
            }
            


            $(".ordo-user-input").remove();
            
            if(data.cell.cell_type == "code") {
                $(".selected > .output_wrapper .output").append(ordoEditButtons);
                $(".ordo-add-solution").on('click', (evt) => onEditSol(data.cell));
                $(".ordo-add-success-msg").on('click', (evt) => onEditSuccMsg(data.cell));
                $(".ordo-add-failure-msg").on('click', (evt) => onFailureSuccMsg(data.cell));
            }
            
        });
    };
    

    /**
     * html for the feedback buttons on a cell
     */
    var ordoEditButtons = 
        "<div class='btn-group col-md-offset-1 ordo-user-input' role='group' aria-label='author input values'>" +
            "<button type='button' title='add solution' class='btn btn-default fa fa-plus ordo-add-solution' data-field='ordo_solution'> Solution </button>" +
            "<button type='button' title='add success message' class='btn btn-success fa fa-thumbs-o-up ordo-add-success-msg' data-field='ordo_success'> Message </button>" +
            "<button type='button' title='add failure message' class='btn btn-danger fa fa-thumbs-down ordo-add-failure-msg' data-field='ordo_failure'> Message </button>" +
        "</div>";
    
    
    /**
     * Assembles the html for the input box and returns it
     * @returns {String} inputArea the html for the input box as a string
     */
    var makeMessageInputArea = function() {
        var styles= [
            'bold',
            'plain text',
            'html'
        ];
        
        $sel = $('<select />', {
                    'class': "form-control",
                    'id': "styling",
                    'title': 'Select the styling for the following text'
        });

        $.each(styles, function(index, type) {
            $sel.append("<option>" + type + "</option>")
        });



        var inputArea = 
            $('<div />', {'class': 'inputArea'}).append(
                $('<div />', {'title': 'Message Input Area'}).append(
                    $('<form />', {'class': "form-inline"}).append($sel).append(
                        $('<textarea />', {
                            'class': 'form-control',
                            'id': 'message_text_area',
                            'rows': '2',
                            'style': 'width:70%',
                            'title': 'Input text here!'})).append(
                                $('<button />', {
                                    'class': 'btn btn-default add-field',
                                    'title': 'Add another field'}).append(
                                    $('<span />', {
                                        'class': 'fa fa-plus'}))).append(
                    $('<p />', {
                        'class': 'form-text text-muted',
                        'text': 'When html is selected, users may format their message using html as desired.'
                    }))
                )
        ); 
        
        return inputArea;
    };



    /**
     * Assembles HTML for the create a solution input form and returns it as a string
     * @param {Object} cell The jupyter notebooks cell object
     * @returns {String} inputArea The create a solution input form HTML as a string
     */
    var makeSolutionInputArea = function(cell) {

        console.debug("makeSolutionInputArea", cell.metadata.ordo_solution);

        var output_types = [
            'text/plain',
            'text/html',
            'text/markdown',
            'text/latex',
            'image/svg+xml',
            'image/png',
            'image/jpeg',
            'application/javascript',
            'application/pdf',
            'python'
        ];
            
        $sel = $('<select />', {
            'class': "form-control solution_type",
            'id': "output_type",
            'title': 'Select the output type'
        });
            
        $.each(output_types, function(index, type) {
            opt = $("<option>" + type + "</option>");

            if (cell.metadata.ordo_solution !== undefined && cell.metadata.ordo_solution[type] !== undefined) {
                console.log(type, cell.metadata.ordo_solution[type]);
                opt.attr('selected', true);
            }

            $sel.append(opt);
        })


        var inputArea = $('<div />', {
            'title': 'Solution Input Area'
        }).append(
            $('<form />', {
                'class': "form-inline"
            }).append($sel).append(
                $('<textarea />', {
                    'class': 'form-control solution_text_area',
                    'id': 'solution_text_area',
                    'rows': '2',
                    'style': 'width:65%',
                    'title': 'Input text here!'
                })).append(
                $('<button />', {
                    'class': 'btn btn-default',
                    'title': 'Add another field'
                }).append(
                    $('<span />', {
                        'class': 'fa fa-plus'
                    })
                )
            )
        );


        if (cell.metadata.ordo_solution !== undefined) {
            $('#solution_text_area', inputArea).val(solutionToString(cell.metadata.ordo_solution));
        }
        
        return inputArea;
    };


    var ordo_exts = function() {
        return Jupyter.notebook.config.loaded
            .then(readConfig)
            .then(initialize)
            .catch(function on_error(reason) {
                console.error('Error:', reason);
        });
    };

    return {
        load_ipython_extension: ordo_exts
    }
});
