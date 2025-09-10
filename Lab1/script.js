const Xn = 95.047;
const Yn = 100.0;
const Zn = 108.883;

function clampRgb(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function clampCmyk(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function clampL(value) {
    return Math.max(0, Math.min(100, value));
}
function clampAB(value) {
    return Math.max(-128, Math.min(127, value));
}

function isValidNumber(value) {
    return !isNaN(value) && isFinite(value);
}

let warningTimeout;
function showWarning(message) {
    const warningDiv = document.getElementById('warning');
    warningDiv.textContent = `⚠ ${message}`;
    warningDiv.classList.remove('hidden');
    clearTimeout(warningTimeout);
    warningTimeout = setTimeout(() => {
        warningDiv.classList.add('hidden');
    }, 5000);
}

function rgbToCmyk(r, g, b) {
    r = clampRgb(r);
    g = clampRgb(g);
    b = clampRgb(b);

    let rNorm = r / 255.0;
    let gNorm = g / 255.0;
    let bNorm = b / 255.0;

    let k = 1.0 - Math.max(rNorm, gNorm, bNorm);
    if (k === 1.0) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }

    let c = (1.0 - rNorm - k) / (1.0 - k);
    let m = (1.0 - gNorm - k) / (1.0 - k);
    let y = (1.0 - bNorm - k) / (1.0 - k);

    return {
        c: clampCmyk(c * 100),
        m: clampCmyk(m * 100),
        y: clampCmyk(y * 100),
        k: clampCmyk(k * 100)
    };
}

function cmykToRgb(c, m, y, k) {
    c = clampCmyk(c);
    m = clampCmyk(m);
    y = clampCmyk(y);
    k = clampCmyk(k);

    let cNorm = c / 100.0;
    let mNorm = m / 100.0;
    let yNorm = y / 100.0;
    let kNorm = k / 100.0;

    let r = 255 * (1 - cNorm) * (1 - kNorm);
    let g = 255 * (1 - mNorm) * (1 - kNorm);
    let b = 255 * (1 - yNorm) * (1 - kNorm);

    return {
        r: clampRgb(r),
        g: clampRgb(g),
        b: clampRgb(b)
    };
}

function rgbToXyz(r, g, b) {
    r = clampRgb(r);
    g = clampRgb(g);
    b = clampRgb(b);

    let rNorm = r / 255.0;
    let gNorm = g / 255.0;
    let bNorm = b / 255.0;

    function gammaCorrect(c) {
        if (c > 0.04045) {
            return Math.pow((c + 0.055) / 1.055, 2.4);
        } else {
            return c / 12.92;
        }
    }

    let rLinear = gammaCorrect(rNorm) * 100;
    let gLinear = gammaCorrect(gNorm) * 100;
    let bLinear = gammaCorrect(bNorm) * 100;

    let x = rLinear * 0.412453 + gLinear * 0.357580 + bLinear * 0.180423;
    let y = rLinear * 0.212671 + gLinear * 0.715160 + bLinear * 0.072169;
    let z = rLinear * 0.019334 + gLinear * 0.119193 + bLinear * 0.950227;

    return { x, y, z };
}

function xyzToRgb(x, y, z) {
    let xNorm = x / 100.0;
    let yNorm = y / 100.0;
    let zNorm = z / 100.0;

    let rLinear = xNorm * 3.2406 + yNorm * -1.5372 + zNorm * -0.4986;
    let gLinear = xNorm * -0.9689 + yNorm * 1.8758 + zNorm * 0.0415;
    let bLinear = xNorm * 0.0557 + yNorm * -0.2040 + zNorm * 1.0570;

    function invGammaCorrect(c) {
        if (c > 0.0031308) {
            return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        } else {
            return 12.92 * c;
        }
    }

    let rNorm = invGammaCorrect(rLinear);
    let gNorm = invGammaCorrect(gLinear);
    let bNorm = invGammaCorrect(bLinear);

    let r = rNorm * 255;
    let g = gNorm * 255;
    let b = bNorm * 255;

    let clampedR = clampRgb(r);
    let clampedG = clampRgb(g);
    let clampedB = clampRgb(b);

    if (clampedR !== r || clampedG !== g || clampedB !== b) {
         showWarning("Значения RGB были скорректированы (выход за пределы 0-255).");
    }

    return { r: clampedR, g: clampedG, b: clampedB };
}

function xyzToLab(x, y, z) {
    function f(t) {
        if (t > 0.008856) {
            return Math.pow(t, 1/3);
        } else {
            return (7.787 * t) + (16 / 116);
        }
    }

    let xRatio = x / Xn;
    let yRatio = y / Yn;
    let zRatio = z / Zn;

    let fx = f(xRatio);
    let fy = f(yRatio);
    let fz = f(zRatio);

    let l = (116 * fy) - 16;
    let a = 500 * (fx - fy);
    let b = 200 * (fy - fz);

    return {
        l: clampL(l),
        a: clampAB(a),
        b: clampAB(b)
    };
}

function labToXyz(l, a, b) {
    l = clampL(l);
    a = clampAB(a);
    b = clampAB(b);

    function fInv(t) {
        let tCubed = Math.pow(t, 3);
        if (tCubed > 0.008856) {
            return tCubed;
        } else {
            return (t - 16 / 116) / 7.787;
        }
    }

    let fy = (l + 16) / 116;
    let fx = a / 500 + fy;
    let fz = fy - b / 200;

    let x = fInv(fx) * Xn;
    let y = fInv(fy) * Yn;
    let z = fInv(fz) * Zn;

    return { x, y, z };
}

function cmykToLab(c, m, y, k) {
    let rgb = cmykToRgb(c, m, y, k);
    let xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
    return xyzToLab(xyz.x, xyz.y, xyz.z);
}

function labToCmyk(l, a, b) {
    let xyz = labToXyz(l, a, b);
    let rgb = xyzToRgb(xyz.x, xyz.y, xyz.z);
    return rgbToCmyk(rgb.r, rgb.g, rgb.b);
}

function updatePreview(r, g, b) {
    const preview = document.getElementById('color-preview');
    preview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    document.getElementById('color-hex-display').textContent = `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}

function updateRgbInputs(r, g, b) {
    document.getElementById('r').value = r;
    document.getElementById('g').value = g;
    document.getElementById('b').value = b;
    document.getElementById('r-slider').value = r;
    document.getElementById('g-slider').value = g;
    document.getElementById('b-slider').value = b;
    document.getElementById('rgb-picker').value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function updateCmykInputs(c, m, y, k) {
    document.getElementById('c').value = c;
    document.getElementById('m').value = m;
    document.getElementById('y').value = y;
    document.getElementById('k').value = k;
    document.getElementById('c-slider').value = c;
    document.getElementById('m-slider').value = m;
    document.getElementById('y-slider').value = y;
    document.getElementById('k-slider').value = k;
    let rgb = cmykToRgb(c,m,y,k);
    document.getElementById('cmyk-picker').value = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
}

function updateLabInputs(l, a, b) {
    document.getElementById('l').value = parseFloat(l.toFixed(2));
    document.getElementById('a').value = parseFloat(a.toFixed(2));
    document.getElementById('b_lab').value = parseFloat(b.toFixed(2));
    document.getElementById('l-slider').value = l;
    document.getElementById('a-slider').value = a;
    document.getElementById('b_lab-slider').value = b;
    let xyz = labToXyz(l,a,b);
    let rgb = xyzToRgb(xyz.x, xyz.y, xyz.z);
    document.getElementById('lab-picker').value = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
}

const recentColors = [];

function addToRecentColors(hexColor) {
    const index = recentColors.indexOf(hexColor);
    if (index !== -1) {
        recentColors.splice(index, 1);
    }
    recentColors.unshift(hexColor);
    if (recentColors.length > 12) {
        recentColors.pop();
    }
    updateRecentColorsDisplay();
}

function updateRecentColorsDisplay() {
    const container = document.getElementById('recent-colors');
    container.innerHTML = '';
    recentColors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'recent-color-item';
        colorDiv.style.backgroundColor = color;
        colorDiv.title = color;
        colorDiv.addEventListener('click', () => {
             const r = parseInt(color.substring(1, 3), 16);
             const g = parseInt(color.substring(3, 5), 16);
             const b = parseInt(color.substring(5, 7), 16);
             document.getElementById('r').value = r;
             document.getElementById('g').value = g;
             document.getElementById('b').value = b;
             syncColors('rgb');
        });
        container.appendChild(colorDiv);
    });
}

let isSyncing = false;

function syncColors(sourceModel) {
    if (isSyncing) return;
    isSyncing = true;

    let r, g, b;
    let c, m, y, k;
    let l, a, b_lab;

    try {
        if (sourceModel === 'rgb') {
            r = parseFloat(document.getElementById('r').value) || 0;
            g = parseFloat(document.getElementById('g').value) || 0;
            b = parseFloat(document.getElementById('b').value) || 0;

            if (!isValidNumber(r) || !isValidNumber(g) || !isValidNumber(b)) {
                showWarning("Некорректное значение RGB. Используются значения по умолчанию.");
                r = g = b = 127;
            }

            r = clampRgb(r);
            g = clampRgb(g);
            b = clampRgb(b);

            let cmyk = rgbToCmyk(r, g, b);
            c = cmyk.c; m = cmyk.m; y = cmyk.y; k = cmyk.k;

            let xyz = rgbToXyz(r, g, b);
            let lab = xyzToLab(xyz.x, xyz.y, xyz.z);
            l = lab.l; a = lab.a; b_lab = lab.b;

        } else if (sourceModel === 'cmyk') {
            c = parseFloat(document.getElementById('c').value) || 0;
            m = parseFloat(document.getElementById('m').value) || 0;
            y = parseFloat(document.getElementById('y').value) || 0;
            k = parseFloat(document.getElementById('k').value) || 0;

            if (!isValidNumber(c) || !isValidNumber(m) || !isValidNumber(y) || !isValidNumber(k)) {
                showWarning("Некорректное значение CMYK. Используются значения по умолчанию.");
                c = m = y = 0; k = 50;
            }

            c = clampCmyk(c);
            m = clampCmyk(m);
            y = clampCmyk(y);
            k = clampCmyk(k);

            let rgbObj = cmykToRgb(c, m, y, k);
            r = rgbObj.r; g = rgbObj.g; b = rgbObj.b;

            let lab = cmykToLab(c, m, y, k);
            l = lab.l; a = lab.a; b_lab = lab.b;

        } else if (sourceModel === 'lab') {
            l = parseFloat(document.getElementById('l').value) || 0;
            a = parseFloat(document.getElementById('a').value) || 0;
            b_lab = parseFloat(document.getElementById('b_lab').value) || 0;

            if (!isValidNumber(l) || !isValidNumber(a) || !isValidNumber(b_lab)) {
                showWarning("Некорректное значение LAB. Используются значения по умолчанию.");
                l = 53.2; a = b_lab = 0;
            }

            l = clampL(l);
            a = clampAB(a);
            b_lab = clampAB(b_lab);

            let xyz = labToXyz(l, a, b_lab);
            let rgbObj = xyzToRgb(xyz.x, xyz.y, xyz.z);
            r = rgbObj.r; g = rgbObj.g; b = rgbObj.b;

            let cmyk = labToCmyk(l, a, b_lab);
            c = cmyk.c; m = cmyk.m; y = cmyk.y; k = cmyk.k;
        }

        updateRgbInputs(r, g, b);
        updateCmykInputs(c, m, y, k);
        updateLabInputs(l, a, b_lab);
        updatePreview(r, g, b);
        addToRecentColors(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

    } catch (error) {
        console.error("Ошибка при синхронизации цветов:", error);
        showWarning("Произошла ошибка при пересчете цвета.");
    } finally {
        isSyncing = false;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    syncColors('rgb');

    const rgbInputs = ['r', 'g', 'b'];
    rgbInputs.forEach(id => {
        const input = document.getElementById(id);
        const slider = document.getElementById(`${id}-slider`);

        const handleInput = () => {
            let val = parseFloat(input.value);
            if (isValidNumber(val)) {
                val = clampRgb(val);
                input.value = val;
                slider.value = val;
                syncColors('rgb');
            } else if (input.value === '' || input.value === '-') {
            } else {
                showWarning(`Некорректное значение для ${id.toUpperCase()}.`);
                input.value = slider.value;
            }
        };

        input.addEventListener('input', handleInput);
        input.addEventListener('blur', () => {
             let val = parseFloat(input.value);
             if (!isValidNumber(val)) {
                 val = 0;
                 input.value = val;
             }
             val = clampRgb(val);
             input.value = val;
             slider.value = val;
             syncColors('rgb');
        });

        slider.addEventListener('input', () => {
            input.value = slider.value;
        });
        slider.addEventListener('change', () => {
            input.value = slider.value;
            syncColors('rgb');
        });
    });

    document.getElementById('rgb-picker').addEventListener('input', () => {
        const hex = document.getElementById('rgb-picker').value;
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        document.getElementById('r').value = r;
        document.getElementById('g').value = g;
        document.getElementById('b').value = b;
        syncColors('rgb');
    });


    const cmykInputs = ['c', 'm', 'y', 'k'];
    cmykInputs.forEach(id => {
        const input = document.getElementById(id);
        const slider = document.getElementById(`${id}-slider`);

        const handleInput = () => {
            let val = parseFloat(input.value);
            if (isValidNumber(val)) {
                val = clampCmyk(val);
                input.value = val;
                slider.value = val;
                syncColors('cmyk');
            } else if (input.value === '' || input.value === '-') {
            } else {
                showWarning(`Некорректное значение для ${id.toUpperCase()}.`);
                input.value = slider.value;
            }
        };

        input.addEventListener('input', handleInput);
        input.addEventListener('blur', () => {
             let val = parseFloat(input.value);
             if (!isValidNumber(val)) {
                 val = 0;
                 input.value = val;
             }
             val = clampCmyk(val);
             input.value = val;
             slider.value = val;
             syncColors('cmyk');
        });

        slider.addEventListener('input', () => {
            input.value = slider.value;
        });
        slider.addEventListener('change', () => {
            input.value = slider.value;
            syncColors('cmyk');
        });
    });

    document.getElementById('cmyk-picker').addEventListener('input', () => {
        const hex = document.getElementById('cmyk-picker').value;
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        let cmyk = rgbToCmyk(r, g, b);
        document.getElementById('c').value = cmyk.c;
        document.getElementById('m').value = cmyk.m;
        document.getElementById('y').value = cmyk.y;
        document.getElementById('k').value = cmyk.k;
        syncColors('cmyk');
    });


    const labInputs = ['l', 'a', 'b_lab'];
    labInputs.forEach(id => {
        const input = document.getElementById(id);
        const slider = document.getElementById(`${id}-slider`);

        const handleInput = () => {
            let val = parseFloat(input.value);
            if (isValidNumber(val)) {
                if (id === 'l') val = clampL(val);
                else val = clampAB(val);
                input.value = parseFloat(val.toFixed(2));
                slider.value = val;
                syncColors('lab');
            } else if (input.value === '' || input.value === '-') {
            } else {
                showWarning(`Некорректное значение для ${id === 'b_lab' ? 'B' : id.toUpperCase()}.`);
                input.value = slider.value;
            }
        };

        input.addEventListener('input', handleInput);
        input.addEventListener('blur', () => {
             let val = parseFloat(input.value);
             if (!isValidNumber(val)) {
                 val = id === 'l' ? 53.2 : 0;
                 input.value = val;
             }
             if (id === 'l') val = clampL(val);
             else val = clampAB(val);
             input.value = parseFloat(val.toFixed(2));
             slider.value = val;
             syncColors('lab');
        });

        slider.addEventListener('input', () => {
            input.value = parseFloat(slider.value).toFixed(2);
        });
        slider.addEventListener('change', () => {
            input.value = parseFloat(slider.value).toFixed(2);
            syncColors('lab');
        });
    });

    document.getElementById('lab-picker').addEventListener('input', () => {
        const hex = document.getElementById('lab-picker').value;
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        let xyz = rgbToXyz(r, g, b);
        let lab = xyzToLab(xyz.x, xyz.y, xyz.z);
        document.getElementById('l').value = parseFloat(lab.l.toFixed(2));
        document.getElementById('a').value = parseFloat(lab.a.toFixed(2));
        document.getElementById('b_lab').value = parseFloat(lab.b.toFixed(2));
        syncColors('lab');
    });
});