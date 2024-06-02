$(document).ready(function () {
    'use strict'

    let binTable = $('#binTable')

    let toast = new custom.Toast($('#toast'))
    let modal = new custom.Modal($('#modal'))

    binTable.bootstrapTable({
        url: _urls.apiBin,
        dataField: 'results',
        totalField: 'count',
        sidePagination: 'server',
        classes: 'table table-hover',
        toolbar: '#toolbar',
        clickToSelect: true,
        pagination: true,
        pageSize: 8,
        paginationHAlign: 'end',
        paginationParts: ['pageList'],
        loadingTemplate: table.loadingTemplate,
        formatNoMatches: function () {
            return 'Нет восстановленных файлов';
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

    table.tableSort(binTable)
    table.tableOrder(binTable)
    table.tableSearch(binTable)

    $('#delBtn').click(function () {
        let checks = binTable.bootstrapTable('getSelections')

        if (checks.length === 0) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText('Файлы не выбраны')
            toast.getToast().show()
        } else {
            modal.setTitle("Вы уверены, что хотите удалить выбранный файл навсегда")
            modal.setBtnType("btn btn-danger")

            function del() {
                let uuids = checks.map(item => item.file_uuid)
                let use = _config.used - checks.map(item => item.file_size).reduce((prev, curr) => prev + curr)

                table.alterCallback(_urls.fileDelete, {uuids: uuids}, toast, binTable).done(function () {
                    $('#used').text(custom.fileSizeFormat(use))
                    _config.used = use
                    localStorage.setItem('used', use)
                })
                modal.getModal().hide()
            }

            modal.elem.one('show.mdb.modal', function () {
                modal.btn.on('click', del)
            }).one('hide.mdb.modal', function () {
                modal.btn.off('click', del)
            })
            modal.getModal().show()
        }
    })

    $('#recycleBtn').click(function () {
        let checks = binTable.bootstrapTable('getSelections')

        if (checks.length === 0) {
            toast.setIcon('fas fa-exclamation-circle text-warning')
            toast.setText('Файлы не выбраны')
            toast.getToast().show()
        } else {
            modal.setTitle("Вы уверены, что восстановите выбранные файлы")
            modal.setBtnType("btn btn-primary")

            function recycle() {
                let uuids = checks.map(item => item.file_uuid)

                table.alterCallback(_urls.fileTrash, {method: 'recycle', uuids: uuids}, toast, binTable)
                modal.getModal().hide()
            }

            modal.elem.one('show.mdb.modal', function () {
                modal.btn.on('click', recycle)
            }).one('hide.mdb.modal', function () {
                modal.btn.off('click', recycle)
            })
            modal.getModal().show()
        }
    })

    binTable.on('post-body.bs.table', function () {
        $('.custom-link').each(function (i, elem) {
            let uuid = elem.dataset.customUuid
            let size = elem.dataset.customSize
            let func = null

            switch (elem.dataset.customMethod) {
                case "recycle":
                    func = function () {
                        fileRecycle(uuid)
                    }
                    break
                case "del":
                    func = function () {
                        fileDel(uuid, size)
                    }
                    break
            }
            elem.addEventListener('click', func)
        })
    })

    /**
     * Функция настройки таблицы
     */
    function actionsFormatter(value, row) {
        return `<div class="d-flex flex-column flex-md-row align-items-center">
                    <a class="icon-link custom-link" href="javascript:void(0)" data-custom-uuid="${row.file_uuid}" data-custom-method="recycle">
                        <i class="fas fa-undo-alt"></i>
                    </a>
                    <a class="ms-md-3 icon-link custom-link" href="javascript:void(0)" data-custom-uuid="${row.file_uuid}" data-custom-size="${row.file_size}" data-custom-method="del">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>`
    }

    /**
     * Способ работы с файлом
     */

    function fileRecycle(uuid) {
        table.alterCallback(_urls.fileTrash, {method: 'recycle', uuids: [uuid]}, toast, binTable)
    }

    function fileDel(uuid, size) {
        modal.setTitle("Вы уверены, что хотите удалить файл навсегда")
        modal.setBtnType("btn btn-danger")

        function del() {
            let use = _config.used - size

            table.alterCallback(_urls.fileDelete, {uuids: [uuid]}, toast, binTable).done(function () {
                $('#used').text(custom.fileSizeFormat(use))
                _config.used = use
                localStorage.setItem('used', use)
            })
            modal.getModal().hide()
        }

        modal.elem.one('show.mdb.modal', function () {
            modal.btn.on('click', del)
        }).one('hide.mdb.modal', function () {
            modal.btn.off('click', del)
        })
        modal.getModal().show()
    }
})