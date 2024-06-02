$(document).ready(function () {
    'use strict'

    let toast = new custom.Toast($('#toast'))

    // Размещение cropper
    let avatar = $('#avatar').get(0)
    let cropBoxData
    let canvasData
    let cropper
    let cropOptions = {
        aspectRatio: 1,
        autoCropArea: 0.5,
        dragMode: "move",
        center: false,
        highlight: false,
        toggleDragModeOnDblclick: false,
        preview: ".preview",
        ready: function () {
            cropper.setCropBoxData(cropBoxData).setCanvasData(canvasData)
        },
    }

    // Инициация cropper
    $("#avatarModal").on('shown.bs.modal', function () {
        cropper = new Cropper(avatar, cropOptions)
    }).on('hidden.bs.modal', function () {
        cropBoxData = cropper.getCropBoxData()
        canvasData = cropper.getCanvasData()
        cropper.destroy()
    })

    // Загрузка изображения
    $('#CropUpload').click(function () {
        $('#uploadInput').click()
    })

    $("#uploadInput").on('change', function () {
        let file = this.files[0]
        if (file.size > _config.MAX_AVATAR_SIZE) {
            toast.setIcon('fas fa-exclamation-circle text-danger')
            toast.setText(`изображение слишком большое.${custom.fileSizeFormat(_config.MAX_AVATAR_SIZE)}`)
            toast.getToast().show()
        } else {
            let reader = new FileReader()
            reader.onload = function (e) {
                cropper.replace(e.target.result)
            }
            reader.readAsDataURL(file)
        }
        this.value = ''
    })

    // Редактирование изображений
    $('#CropRotateRight').click(function () {
        cropper.rotate(45)
    })
    $('#CropRotateLeft').click(function () {
        cropper.rotate(-45)
    })
    $('#CropZoomIn').click(function () {
        cropper.zoom(0.1)
    })
    $('#CropZoomOut').click(function () {
        cropper.zoom(-0.1)
    })
    $('#CropReset').click(function () {
        cropper.reset()
    })

    // Загрузка изображения
    $('#CropConfirm').click(function () {
        cropper.getCroppedCanvas().toBlob((blob) => {
            let formData = new FormData()
            let $btn = $(this)
            formData.append('avatar', blob, 'upload.png')

            $.ajax({
                url: _urls.avatar,
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $btn.prop('disabled', true)
                },
                complete: function () {
                    setTimeout(function () {
                        $btn.prop('disabled', false)
                    }, 400)
                },
                success: function (res) {
                    if (res.code === 200) {
                        toast.setIcon('fas fa-check-circle text-success')
                        setTimeout(function () {
                            location.replace(_urls.profile)
                        }, 400)
                    } else {
                        toast.setIcon('fas fa-exclamation-circle text-danger')
                    }
                    toast.setText(res.msg)
                    toast.getToast().show()
                }
            })
        })
    })

    // Изменить обратный вызов
    function alterCallback(url, formData, $btn, type) {
        $.ajax({
            url: url,
            method: 'POST',
            data: formData,
            beforeSend: function () {
                $btn.prop('disabled', true)
            },
            complete: function () {
                setTimeout(function () {
                    $btn.prop('disabled', false)
                }, 1000)
            },
            success: function (res) {
                if (res.code === 200) {
                    toast.setIcon('fas fa-check-circle text-success')
                    toast.setText(res.msg)
                    toast.getToast().show()
                    setTimeout(function () {
                        location.replace(_urls.profile)
                    }, 1000)
                } else {
                    if (type === 'message') {
                        toast.setIcon('fas fa-exclamation-circle text-danger')
                        toast.setText(res.msg)
                        toast.getToast().show()
                    } else {
                        let errors = res.data.errors
                        let [validations, $form] = type === 'password' ? [passwordValidations, $passwordForm] : [infoValidations, $infoForm]
                        $.each(errors, function (key) {
                            validations[key].elem.text(errors[key][0])
                            $form.find(`input[name=${key}]`).addClass('is-invalid')
                        })
                    }
                }
            }
        })
    }


    // Поменять пароль
    let $passwordForm = $('#passwordForm')
    let passwordForm = $passwordForm.get(0)

    let passwordInputs = $passwordForm.find('input')
    let passwordValidations = custom.getInitial(passwordInputs)

    $passwordForm.find('#passwordBtn').click(function () {
        if (!passwordForm.checkValidity()) {
            custom.setInitial(passwordValidations, passwordInputs, $passwordForm)
        } else {
            if (!custom.checkPassword($('#newPassword'), $('#confirmPassword'))) {
            } else {
                passwordInputs.removeClass('is-invalid')

                let formData = $passwordForm.serialize()
                alterCallback(_urls.password, formData, $(this), 'password')
            }
        }
    })

    // Изменять информацию
    let $infoForm = $('#infoForm')
    let infoForm = $infoForm.get(0)

    let infoInputs = $infoForm.find('input')
    let infoValidations = custom.getInitial(infoInputs)

    $infoForm.find('#infoBtn').click(function () {
        if (!infoForm.checkValidity()) {
            custom.setInitial(infoValidations, infoInputs, $infoForm)
        } else {
            infoInputs.removeClass('is-invalid')

            let formData = $infoForm.serialize()
            alterCallback(_urls.info, formData, $(this), 'info')
        }
    })

    // Подать заявку на членство
    let $applyForm = $('#applyForm')
    let applyForm = $applyForm.get(0)

    $applyForm.find('#applyBtn').click(function () {
        if (applyForm.checkValidity()) {
            let formData = $applyForm.serialize()
            alterCallback(_urls.msgApprove, formData, $(this), 'message')
        }
    })

    // Сообщение пользователя
    let $messageForm = $('#messageForm')
    let messageForm = $messageForm.get(0)

    $messageForm.find('#messageBtn').click(function () {
        if (messageForm.checkValidity()) {
            let formData = $messageForm.serialize()
            alterCallback(_urls.msgApprove, formData, $(this), 'message')
        }
    })
})