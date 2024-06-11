//menu
var tombolmenu = $(".tombol-menu");
var menu = $("nav .menu ul");

function klikMenu() {
  tombolmenu.click(function () {
    menu.toggle();
  });
  menu.click(function () {
    menu.toggle();
  });
}

$(document).ready(function () {
  var width = $(window).width();
  if (width <990) {
    klikMenu();
  }
})

//check lebar
$(window).resize(function(){
    var width = $(window).width();
    if(width > 989){
        menu.css("display","block");
        //display:block
    }else{
        menu.css("display","none");
    }
    klikMenu();
});

//efek scroll
$(document).ready(function () {
  var scroll_pos = 0;
  $(document).scroll(function(){
    scroll_pos = $(this).scrollTop();
    if(scroll_pos > 0) {
      $("nav").addClass("putih");
      $("nav img.hitam").hide();
      $("nav img.putih").show();
    }else{
      $("nav").removeClass("putih");
      $("nav img.hitam").hide();
      $("nav img.hitam").show();
    }
  })
});

$(document).ready(function() {
  // Navigation link click event
  $('nav ul li a').on('click', function(event) {
    event.preventDefault(); // Prevent default link behavior
    var targetPage = $(this).attr('href');
    window.location.href = targetPage; // Navigate to the target page
  });
});


//kamera
document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('capture-button');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const imageDataInput = document.getElementById('imageData');
    const captureForm = document.getElementById('capture-form');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('upload-area');
    const previewContainer = document.getElementById('preview-container');
    const preview = document.getElementById('preview');
    const uploadForm = document.getElementById('upload-form');
    const importBtn = document.querySelector('.import-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    let cameraStream = null;

    // Handle capture from camera
    if (captureButton && video && canvas && imageDataInput && captureForm) {
        captureButton.addEventListener('click', function() {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function(stream) {
                    cameraStream = stream;
                    video.srcObject = stream;
                    video.style.display = 'block';
                })
                .catch(function(err) {
                    console.log('Error accessing camera: ', err);
                });
        });

        captureForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            video.style.display = 'none';
            canvas.style.display = 'block';

            const dataURL = canvas.toDataURL('image/png');
            imageDataInput.value = dataURL;

            // Stop the camera stream
            if (cameraStream) {
                const tracks = cameraStream.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }

            const formData = new FormData();
            formData.append('imageData', dataURL);

            fetch('/identifikasi', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.result) {
                    window.location.href = `/result?result=${data.result}&image_url=${encodeURIComponent(data.image_url)}`;
                } else {
                    alert('Prediction failed. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }

    // Handle file upload
    if (fileInput && uploadArea && previewContainer && preview) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragging');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragging');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragging');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const file = files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        document.querySelector('label[for="fileInput"]').addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        importBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (fileInput.files.length === 0) {
                alert('Please select an image file first.');
                return;
            }

            const formData = new FormData(uploadForm);
            const file = fileInput.files[0];
            formData.append('file', file);

            fetch('/identifikasi', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.result) {
                    window.location.href = `/result?result=${data.result}&image_url=${encodeURIComponent(data.image_url)}`;
                } else {
                    alert('Prediction failed. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });

        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.value = '';
            previewContainer.style.display = 'none';
        });
    }
});
