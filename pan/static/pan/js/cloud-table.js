$(document).ready(function () {
    'use strict'

    let toggleView = 'customView'
    let cloudTable = $('#cloudTable')
    let stackNav = [$('.breadcrumb-item:first')]

    let alert = new custom.Alert($('#alert'))
    let toast = new custom.Toast($('#toast'))
    let modal = new custom.Modal($('#modal'))
    let shareModal = new custom.BaseModal($('#shareModal'))
    let moveModal = new custom.BaseModal($('#moveModal'))

    shareModal.elem.on('hidden.mdb.modal', function () {
        shareModal.elem.find('#delta').data('customDelta', 7).text('7 дней')
    })
    moveModal.elem.on('hidden.mdb.modal', function () {
        moveModal.elem.find('.modal-body').empty()
    })

    cloudTable.bootstrapTable({
        url: _urls.apiCloud,
        classes: 'table table-hover',
        toolbar: '#toolbar',
        clickToSelect: true,
        showCustomView: true,
        loadingTemplate: table.loadingTemplate,
        customView: customView,
        formatNoMatches: function () {
            return 'Безоблачный дисковый файл'
        },
        columns: [{
            checkbox: true,
        }, {
            field: 'file_name',
            title: 'Имя файла',
            formatter: table.fileNameFormatter,
        }, {
            field: 'file_type',
            title: 'Тип файла',
            formatter: table.fileTypeFormatter,
        }, {
            field: 'file_size',
            title: 'Размер файла',
            formatter: custom.fileSizeFormat,
        }, {
            field: 'create_time',
            title: 'Время загрузки',
        }, {
            clickToSelect: false,
            formatter: actionsFormatter,
        }],
    })

    table.tableSearch(cloudTable)

    // Сброс навигации по хлебным крошкам
    cloudTable.on('refresh-options.bs.table', function () {
        let dom = $('<ol class="breadcrumb mb-0"></ol>').append(stackNav[0].addClass('breadcrumb-active'))
        $('.breadcrumb').replaceWith(dom)
    })

    // сортировать
    $('.sort').click(function () {
        let sortBy = this.dataset.customSort
        let folderUUID = stackNav[stackNav.length - 1].data('customUuid')
        $('#sortBy').text(this.textContent).data('customSort', sortBy)
        cloudTable.bootstrapTable('refresh', {
            query: {
                folderUUID: folderUUID === '' ? undefined : folderUUID,
                order: $('#sortOrder').data('customOrder'),
                sort: sortBy
            }
        })
    })

    // Восходящая и нисходящая последовательность
    $('#sortOrder').click(function () {
        let elem = $(this)
        let folderUUID = stackNav[stackNav.length - 1].data('customUuid')
        elem.data('customOrder') === 'desc' ? elem.data('customOrder', 'asc') : elem.data('customOrder', 'desc')
        elem.children().first().toggleClass('fa-sort-down fa-sort-up')
        cloudTable.bootstrapTable('refresh', {
            query: {
                folderUUID: folderUUID === '' ? undefined : folderUUID,
                order: elem.data('customOrder'),
                sort: $('#sortBy').data('customSort')
            }
        })
    })

    // Переключить вид
    $('#toggleViewBtn').click(function () {
        $(this).children().first().toggleClass('fa-grip-horizontal fa-table')
        cloudTable.bootstrapTable('toggleCustomView')
        cloudTable.bootstrapTable('uncheckAll')
        toggleView = toggleView === 'customView' ? 'tableView' : 'customView'
    })

    // Загрузить файл
    $('.upload').click(function () {
        this.nextElementSibling.click()
    })

    $('.uploadInput').each(function (i, elem) {
        let func = null

        switch (elem.dataset.customMethod) {
            case "uploadFile":
                func = fileUpload
                break
            case "uploadDir":
                func = folderUpload
                break
        }
        elem.addEventListener('change', func)
    })

    // Удалить выбранный файл
    $('#trashBtn').click(function () {
        let checks = toggleView === 'customView' ? $('.fixed-table-custom-view input[type=checkbox]:checked') : cloudTable.bootstrapTable('getSelections')

        if (checks.length === 0) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText('Файлы не выбраны')
            toast.getToast().show()
        } else {
            modal.setTitle('Вы уверены, что хотите удалить выбранный файл')
            modal.setBtnType('btn btn-danger')

            function trash() {
                let folderUUID = stackNav[stackNav.length - 1].data('customUuid')
                let uuids = toggleView === 'customView' ? $.map(checks, function (item) {
                    return item.dataset.customUuid
                }) : checks.map(function (item) {
                    return item.file_uuid
                })

                table.alterCallback(_urls.fileTrash, {
                    method: 'trash',
                    uuids: uuids
                }, toast, cloudTable, folderUUID === '' ? undefined : folderUUID)

                modal.getModal().hide()
            }

            modal.elem.one('show.mdb.modal', function () {
                modal.btn.on('click', trash)
            }).one('hide.mdb.modal', function () {
                modal.btn.off('click', trash)
            })

            modal.getModal().show()
        }
    })

    // Инициализация просмотра карты
    cloudTable.on('custom-view-post-body.bs.table', function () {
        operateBind()
        checkBind()
    })

    // Инициализация табличного представления
    cloudTable.on('post-body.bs.table', function () {
        operateBind()
    })

    cloudTable.on('dbl-click-cell.bs.table', function (e, field, value, row) {
        if (field === 'file_name') {
            if (row.file_cate === '1') {
                addCrumb(row.file_name, row.file_uuid)
                cloudTable.bootstrapTable('refresh', {query: {folderUUID: row.file_uuid}})
            } else {
                location.href = _urls.detail(row.file_uuid)
            }
        }
    })

    /**
     * Функция настройки таблицы
     */
    function customView(data) {
        if (data.length === 0) {
            return custom.elEmpty(`<p>Загружайте файлы с помощью панели инструментов</p>`)
        }
        let template = $('#cloudTemplate').html()
        let view = ''
        $.each(data, function (i, row) {
            let icon = table.icons[row.file_type]
            view += template
                .replace('%file_cate%', row.file_cate)
                .replace(/%file_uuid%/g, row.file_uuid)
                .replace(/%file_name%/g, row.file_name)
                .replace('%file_size%', custom.fileSizeFormat(row.file_size))
                .replace('%file_icon%', icon === undefined ? 'file_default' : icon)
        })
        return `<div class="row gx-3 gy-3 row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 mx-0">${view}</div>`
    }

    function actionsFormatter(value, row) {
        return `<div class="d-flex flex-column flex-md-row align-items-center">
                    <a class="icon-link custom-link" href="javascript:void(0)" data-custom-method="fileShare" 
                        data-custom-uuid="${row.file_uuid}">
                        <i class="fas fa-paper-plane"></i>
                    </a>
                    <a class="ms-md-3 icon-link dropdown-toggle hidden-arrow" href="javascript:void(0)"
                            data-mdb-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item custom-link icon-link" data-custom-method="fileDownload" 
                                data-custom-uuid="${row.file_uuid}" href="javascript:void(0)"><i class="fas fa-file-download me-2"></i>загрузить</a></li>
                        <li><a class="dropdown-item custom-link icon-link" data-custom-method="fileMove" 
                                data-custom-uuid="${row.file_uuid}" href="javascript:void(0)"><i class="fas fa-expand-arrows-alt me-2"></i>двигать</a></li>
                        <li><a class="dropdown-item custom-link icon-link" data-custom-method="fileTrash" 
                                data-custom-uuid="${row.file_uuid}" href="javascript:void(0)"><i class="fas fa-trash me-2"></i>стереть</a></li>
                    </ul>
                </div>`
    }

    /**
     *  Вспомогательный способ
     */

    // Привязка файловой операции
    function operateBind() {
        $('.custom-link').each(function (i, elem) {
            let uuid = elem.dataset.customUuid
            let func = null

            switch (elem.dataset.customMethod) {
                case 'fileShare':
                    func = function () {
                        fileShare(uuid)
                    }
                    break
                case 'fileDownload':
                    func = function () {
                        fileDownload(uuid)
                    }
                    break
                case 'fileMove':
                    func = function () {
                        fileMove(uuid)
                    }
                    break
                case 'fileTrash':
                    func = function () {
                        fileTrash(uuid)
                    }
                    break
            }
            elem.addEventListener('click', func)
        })
    }

    // Выберите привязку действия
    function checkBind() {
        let timer
        let duration = 500
        let click = true
        let silent = true
        let press = false
        let multiple = false
        let cards = $('.custom-view')
        let isMobile = custom.isMobile()

        function checkIt() {
            let elem = $(this).find('input[type=checkbox]')
            elem.attr('checked', !elem.attr('checked'))
        }

        function jumpTo() {
            let elem = $(this)
            if (elem.data('customCate') === 1) {
                addCrumb(elem.data('customName'), elem.data('customUuid'))
                cloudTable.bootstrapTable('refresh', {query: {folderUUID: elem.data('customUuid')}})
            } else {
                location.href = _urls.detail(elem.data('customUuid'))
            }
        }

        if (!isMobile) {
            cards.click(function () {
                checkIt.call(this)
            }).dblclick(function () {
                jumpTo.call(this)
            })
        } else {
            cards.on('touchstart', function () {
                timer = setTimeout(function () {
                    press = true
                }, duration)
            }).on('touchmove', function () {
                silent = false
            }).on('touchend', function () {
                clearTimeout(timer)
                let checks = cards.find('input[type=checkbox]')

                if (!multiple && press && silent) {
                    multiple = true
                    click = false
                    checks.removeClass('d-none')
                    checkIt.call(this)
                } else if (click && silent) {
                    jumpTo.call(this)
                } else if (!press && multiple && silent) {
                    checkIt.call(this)
                    if (checks.filter(":checked").length === 0) {
                        multiple = false
                        click = true
                        checks.addClass('d-none')
                    }
                }
                press = false
                silent = true
            })
        }
    }

    // Повторно измельчите хлебные крошки
    function renderCrumb(loc) {
        let uuid = loc.data('customUuid') === '' ? undefined : loc.data('customUuid')
        let index = stackNav.findIndex(function (elem) {
            return elem.data('customUuid') === loc.data('customUuid')
        })

        loc.addClass('breadcrumb-active')

        stackNav = stackNav.slice(0, index + 1).map(function (elem) {
            return elem.clone(true)
        })
        let breadcrumb = $('<ol class="breadcrumb mb-0"></ol>')
        for (let i = 0; i < stackNav.length; i++) {
            breadcrumb.append(stackNav[i])
        }
        $('.breadcrumb').replaceWith(breadcrumb)
        cloudTable.bootstrapTable('refresh', {query: {folderUUID: uuid}})
    }

    // хлебные крошки
    function addCrumb(text, uuid) {
        stackNav[stackNav.length - 1].removeClass('breadcrumb-active').click(function () {
            renderCrumb($(this))
        })
        let crumb = $(`<li class="breadcrumb-item breadcrumb-active" data-custom-uuid="${uuid}">${text}</li>`)
        stackNav.push(crumb)
        $('.breadcrumb').append(crumb)
    }

    // Список папок рендеринга
    function renderFolder(container, group, folderUUID, stackFolder, exclude) {
        if (folderUUID === undefined) {
            $(`<li class="list-group-item list-group-item-choice">
                   <i class="fas fa-chevron-down me-2"></i>Корневой каталог
               </li>`
            ).click(function () {
                $(this).toggleClass('selected').siblings('.selected').removeClass('selected')
            }).appendTo(group)
        }
        $.get(_urls.apiFolder, {format: 'json', folderUUID: folderUUID, exclude: exclude}, function (res) {
            res.forEach((value) => {
                $(`<li class="list-group-item list-group-item-choice" data-custom-uuid="${value.file_uuid}">
                       <i class="fas fa-folder me-2"></i>${value.file_name}
                   </li>`
                ).click(function () {
                    $(this).toggleClass('selected').siblings('.selected').removeClass('selected')
                }).dblclick(function () {
                    let dom = $(`<li class="list-group-item list-group-item-choice"><i class="fas fa-chevron-left me-2"></i>Вернитесь на предыдущий уровень</li>`)
                        .click(function () {
                            $(this).toggleClass('selected').siblings('.selected').removeClass('selected')
                        })
                        .dblclick(function () {
                            renderBack(container, group, stackFolder[stackFolder.length - 2], stackFolder, exclude)
                        })
                    stackFolder.push(this.dataset.customUuid)
                    group.empty()
                    group.append(dom)
                    renderFolder(container, group, this.dataset.customUuid, stackFolder, exclude)
                }).appendTo(group)
            })
        })
        container.append(group)
    }

    // Вернитесь к улучшенному меню
    function renderBack(container, group, folderUUID, stackFolder, exclude) {
        stackFolder.pop()
        group.empty()
        if (folderUUID) {
            let dom = $(`<li class="list-group-item list-group-item-choice"><i class="fas fa-chevron-left me-2"></i>Вернитесь на предыдущий уровень</li>`)
                .click(function () {
                    $(this).toggleClass('selected').siblings('.selected').removeClass('selected')
                })
                .dblclick(function () {
                    renderBack(container, group, stackFolder[stackFolder.length - 2], stackFolder, exclude)
                })
            group.append(dom)
        }
        renderFolder(container, group, folderUUID, stackFolder, exclude)
    }

    /**
     * Способ работы с файлом
     */
    function fileShare(uuid) {
        let $elem = shareModal.elem
        let $mask = $elem.find('.copy-mask')
        let $delta = $elem.find('#delta')
        let $deltas = $elem.find('.dropdown-item')
        let $summary = $elem.find('#summary')
        let $copyBtn = $elem.find('.btn-info')

        let isChange = false
        // Получите ключ для заполнения
        $.post(_urls.shareCreate, {uuid: uuid}, function (res) {
            $elem.data('customId', res.data.id)
            $elem.find('#shareLink').text(_urls.share(res.data.signature))
            $elem.find('#shareKey').text(res.data.key)
        })

        $elem.one('show.mdb.modal', function () {
            $mask.on('click', function () {
                custom.copyText(this.previousElementSibling.textContent, alert)
            })
            $copyBtn.on('click', function () {
                custom.copyText(`Общий доступ к паролю: ${$elem.find('#shareKey').text()}\n` +
                    `Обмен ссылками: ${_urls.share($elem.find('#shareLink').text())}`, alert)
            })
            $deltas.on('click', function () {
                isChange = true
                $delta.data('customDelta', Number(this.dataset.customDelta)).text(this.textContent)
            })
            $summary.on('change', function () {
                isChange = true
            })
        }).one('hide.mdb.modal', function () {
            $mask.off('click')
            $copyBtn.off('click')
            $deltas.off('click')
            $summary.off('change')
            if (isChange) {
                table.alterCallback(_urls.shareUpdate, {
                    id: $elem.data('customId'),
                    delta: Number($delta.data('customDelta')),
                    summary: $summary.val()
                }, toast, cloudTable)
            }
        })
        shareModal.mdbModal.show()
    }

    function fileTrash(uuid) {
        let folderUUID = stackNav[stackNav.length - 1].data('customUuid')
        table.alterCallback(_urls.fileTrash, {
            method: 'trash',
            uuids: [uuid]
        }, toast, cloudTable, folderUUID === '' ? undefined : folderUUID)
    }

    function fileDownload(uuid) {
        toast.setIcon('fas fa-info-circle text-info')
        toast.setText('Пожалуйста, подождите минутку')
        toast.getToast().show()
        location.href = _urls.fileBlob(uuid)
    }

    function fileMove(uuid) {
        let elem = moveModal.elem
        let container = elem.find('.modal-body')
        let btn = elem.find('.btn-primary')
        let group = $('<div class="list-group list-group-flush"></div>')
        let stackFolder = [undefined]

        renderFolder(container, group, stackFolder[stackFolder.length - 1], stackFolder, uuid)

        function moveFile() {
            let folderUUID = stackNav[stackNav.length - 1].data('customUuid')
            let dst = elem.find('.selected').data('customUuid')
            table.alterCallback(_urls.fileMove, {
                src: uuid, dst: dst === undefined || '' ? stackFolder[stackFolder.length - 1] : dst
            }, toast, cloudTable, folderUUID === '' ? undefined : folderUUID)

            moveModal.mdbModal.hide()
        }

        elem.one('show.mdb.modal', function () {
            btn.on('click', moveFile)
        }).one('hide.mdb.modal', function () {
            btn.off('click', moveFile)
        })
        moveModal.mdbModal.show()
    }

    function fileUpload() {
        let size = this.files[0].size
        let use = size + _config.used

        if (use > _config.storage) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText('Недостаточно оставшегося места')
            toast.getToast().show()
        } else if (size > _config.MAX_UPLOAD_FILE_SIZE) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText(`Одна загрузка не может превышать${custom.fileSizeFormat(_config.MAX_UPLOAD_FILE_SIZE)}`)
            toast.getToast().show()
        } else {
            let formData = new FormData()
            let uploadName = this.files[0].name
            let folderUUID = stackNav[stackNav.length - 1].data('customUuid')

            if (folderUUID === '') {
                folderUUID = undefined
            } else {
                formData.append("folderUUID", folderUUID)
            }
            formData.append("file", this.files[0])

            uploadCallback(uploadName, _urls.fileUpload, formData, use, folderUUID)
        }
        this.value = ''
    }

    function folderUpload() {
        let size = 0
        let upload_nums = 0
        Array.from(this.files).forEach((value) => {
            size += value.size
            upload_nums += 2
        })
        let use = size + _config.used

        if (use > _config.storage) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText('Недостаточно оставшегося места')
            toast.getToast().show()
        } else if (use > _config.MAX_UPLOAD_FILE_SIZE) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText(`Одна загрузка не может превышать${custom.fileSizeFormat(_config.MAX_UPLOAD_FILE_SIZE)}`)
            toast.getToast().show()
        } else if (upload_nums > _config.DATA_UPLOAD_MAX_NUMBER_FIELDS) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText(`Количество загруженных записей превышает${_config.DATA_UPLOAD_MAX_NUMBER_FIELDS}предел`)
            toast.getToast().show()
        } else {
            let formData = new FormData()
            let uploadName = this.files[0].webkitRelativePath.split('/')[0]
            let folderUUID = stackNav[stackNav.length - 1].data('customUuid')

            if (folderUUID === '') {
                folderUUID = undefined
            } else {
                formData.append("folderUUID", folderUUID)
            }

            this.files.forEach((file) => {
                formData.append('files', file)
                formData.append('paths', file.webkitRelativePath)
            })

            uploadCallback(uploadName, _urls.folderUpload, formData, use, folderUUID)
        }
        this.value = ''
    }

    // Проверка на то же имя
    function uploadCallback(name, url, data, use, uuid) {
        $.getJSON(_urls.dupCheck, {uploadName: name, folderUUID: uuid}, function (res) {
            if (res.code === 200) {
                _uploadBinary(url, data, use, uuid)
            } else {
                toast.setIcon('fas fa-exclamation-circle text-warning')
                toast.setText(res.msg)
                toast.getToast().show()
            }
        })
    }

    //Отправить обратный вызов
    function _uploadBinary(url, data, use, uuid) {
        let $btn = $('#uploadBtn')
        let $uploadToast = $('#uploadToast')
        let progressbar = $uploadToast.find('.progress-bar')
        let cancelBtn = $uploadToast.find('.btn-close')
        $uploadToast.removeClass('hide').addClass('show')

        $.ajax({
            url: url,
            method: 'POST',
            data: data,
            contentType: false,
            processData: false,
            beforeSend: function () {
                $btn.prop('disabled', true)
                $(window).on('beforeunload', function () {
                    return ''
                })
            },
            complete: function () {
                $btn.prop('disabled', false)
                $(window).off('beforeunload')
            },
            xhr: function () {
                let xhr = new XMLHttpRequest()
                cancelBtn.click(function () {
                    modal.setTitle('Вы уверены, что нужно отменить загрузку')
                    modal.setBtnType('btn btn-warning')

                    function cancelUpload() {
                        xhr.abort()
                        modal.getModal().hide()
                        $uploadToast.removeClass('show').addClass('hide')
                    }

                    modal.elem.one('show.mdb.modal', function () {
                        modal.btn.on('click', cancelUpload)
                    }).one('hide.mdb.modal', function () {
                        modal.btn.off('click', cancelUpload)
                    })

                    modal.getModal().show()
                })

                xhr.upload.addEventListener('progress', function (e) {
                    let rate = Math.floor(e.loaded / e.total * 100) + '%'
                    progressbar.css('width', rate).text(rate)
                    if (rate === '100%') {
                        $uploadToast.removeClass('show').addClass('hide')
                        toast.setIcon('fas fa-info-circle text-info')
                        toast.setText('Синхронизация файловой структуры，Пожалуйста, подождите минутку')
                        toast.getToast().show()
                    }
                })

                xhr.upload.addEventListener('abort', function () {
                    toast.setIcon('fas fa-exclamation-circle text-warning')
                    toast.setText('Загрузка была отменена')
                    toast.getToast().show()
                })

                return xhr
            },
            success: function (res) {
                if (res.code === 200) {
                    $('#used').text(custom.fileSizeFormat(use))
                    toast.setIcon('fas fa-check-circle text-success')
                    cloudTable.bootstrapTable('refresh', {query: {folderUUID: uuid}})
                    _config.used = use
                    localStorage.setItem('used', use)
                } else {
                    toast.setIcon('fas fa-exclamation-circle text-warning')
                }
                toast.setText(res.msg)
                toast.getToast().show()
            }
        })
    }
})