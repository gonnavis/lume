
import styles from './scene-style'
import Motor from '../motor/Motor'
import Scene from '../motor/Scene'
import Observable from '../motor/Observable'
import Sizeable from '../motor/Sizeable'
import MotorHTMLBase, {initMotorHTMLBase, proxyGettersSetters} from './base'
import TWEEN from 'tween.js'

import {
    createWebGLContext,
    //removeWebGLContext,
    setGlResolution,
    v3,
    m4,
    vertShaderSource,
    fragShaderSource,
    createShader,
    createProgram,
    Cube
} from '../motor/webglUtils'

initMotorHTMLBase()

const privates = new WeakMap()
const _ = instance => {
    if (!privates.get(instance)) privates.set(instance, {})
    return privates.get(instance)
}

class MotorHTMLScene extends Observable.mixin(MotorHTMLBase) {

    createdCallback() {
        super.createdCallback()

        this._sizePollTask = null
        this._parentSize = {x:0, y:0, z:0}

        //////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////

        // TODO: maybe call this in `init()`, and removeWebGLContext in `deinit()`
        this._gl = createWebGLContext(this)
        if (!this._gl) { console.log('You need WebGL.') }

        // For now, use the same program (with shaders) for all objects.
        // Basically it has position, frag colors, point light, directional
        // light, and ambient light.
        this.makeGlProgram()

        //////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////

        // After the imperativeCounterpart is available it needs to register
        // mount into DOM. This is only for MotorHTMLScenes because their
        // imperativeCounterparts are not added to a parent Node.
        // MotorHTMLNodes get their parent connection from their parent in
        // childConnectedCallback.
        this._imperativeCounterpartPromise
            .then(() => {

                // return if
                if (this.imperativeCounterpart._mounted) return

                if (this.parentNode)
                    this.imperativeCounterpart.mount(this.parentNode)
            })
    }

    makeGlProgram() {
        const gl = this._gl
        const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource)
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource)
        const program = createProgram(gl, vertShader, fragShader)
        gl.useProgram(program)

        // TODO... we need to fill vertexBuffer with each objects vertices.
        // For now we'll just re-use the cube verts. {
        const cube = new Cube(0,0,100)
        const vertexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.verts), gl.STATIC_DRAW)

        // Tell the attribute how to get data out of vertexBuffer (ARRAY_BUFFER)
        const vertexSize = 3;          // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalizeVertexData = false; // don't normalize the data
        const stride = 0;        // 0 = move forward vertexSize * sizeof(type) each iteration to get the next vertex
        const offset = 0;        // start at the beginning of the buffer
        const count = 2/*triangles per side*/ * 3/*vertices per triangle*/ * 6/*sides*/
        const vertexAttributeLocation = gl.getAttribLocation(program, "a_vertexPosition")
        gl.enableVertexAttribArray(vertexAttributeLocation)
        gl.vertexAttribPointer(
            vertexAttributeLocation, vertexSize, type, normalizeVertexData, stride, offset)
        // }

        // TODO... colors per object.
        // For now we'll just re-use the same colors. {
        const vertexColors = new Float32Array(cube.verts.length)

        chooseRandomColors()
        function chooseRandomColors() {
            for (let i=0, l=cube.verts.length; i<l; i+=6*3) { //  6 vertices per side, 3 color parts per vertex

                // four random colors, one for each corner of a quad (two corners
                // have two vertices)
                const colors = [
                    [Math.random(), Math.random(), Math.random()],
                    [Math.random(), Math.random(), Math.random()],
                    [Math.random(), Math.random(), Math.random()],
                    [Math.random(), Math.random(), Math.random()],
                ]

                // first vertex
                vertexColors[i+0]  = colors[0][0]
                vertexColors[i+1]  = colors[0][1]
                vertexColors[i+2]  = colors[0][2]

                // second vertex
                vertexColors[i+3]  = colors[1][0]
                vertexColors[i+4]  = colors[1][1]
                vertexColors[i+5]  = colors[1][2]

                // third vertex
                vertexColors[i+6]  = colors[2][0]
                vertexColors[i+7]  = colors[2][1]
                vertexColors[i+8]  = colors[2][2]

                // fourth vertex
                vertexColors[i+9]  = colors[2][0]
                vertexColors[i+10] = colors[2][1]
                vertexColors[i+11] = colors[2][2]

                // fifth vertex
                vertexColors[i+12] = colors[3][0]
                vertexColors[i+13] = colors[3][1]
                vertexColors[i+14] = colors[3][2]

                // sixth vertex
                vertexColors[i+15] = colors[0][0]
                vertexColors[i+16] = colors[0][1]
                vertexColors[i+17] = colors[0][2]
            }
        }

        const colorsBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertexColors, gl.STATIC_DRAW)

        // Tell the attribute how to get data out of vertexBuffer (ARRAY_BUFFER)
        const colorSize = 3;          // 2 components per iteration
        const colorType = gl.FLOAT;   // the data is 32bit floats
        const normalizeColorData = false; // don't normalize the data
        const colorStride = 0;        // 0 = move forward colorSize * sizeof(colorType) each iteration to get the next vertex
        const colorOffset = 0;        // start at the beginning of the buffer
        const colorAttributeLocation = gl.getAttribLocation(program, 'a_color')
        gl.enableVertexAttribArray(colorAttributeLocation)
        gl.vertexAttribPointer(
            colorAttributeLocation, colorSize, colorType, normalizeColorData, colorStride, colorOffset)
        // }

        // TODO... colors per object.
        // For now we'll just re-use the same colors. {
        const vertexNormals = new Float32Array(cube.verts.length)

        makeNormals()
        function makeNormals() {
            const normals = [
                [0,0,1, ], // front face
                [-1,0,0, ], // left face
                [1,0,0,], // right face
                [0,0,-1,], // back face
                [0,-1,0, ], // top face
                [0,1,0,], // bottom face
            ]

            for (let side=0, i=0, l=cube.verts.length; i<l; i+=6*3, side+=1) { // 6 vertices per side, 3 numbers per vertex normal
                console.log('side:', side)

                // first vertex
                vertexNormals[i+0]  = normals[side][0]
                vertexNormals[i+1]  = normals[side][1]
                vertexNormals[i+2]  = normals[side][2]

                // second vertex
                vertexNormals[i+3]  = normals[side][0]
                vertexNormals[i+4]  = normals[side][1]
                vertexNormals[i+5]  = normals[side][2]

                // third vertex
                vertexNormals[i+6]  = normals[side][0]
                vertexNormals[i+7]  = normals[side][1]
                vertexNormals[i+8]  = normals[side][2]

                // fourth vertex
                vertexNormals[i+9]  = normals[side][0]
                vertexNormals[i+10] = normals[side][1]
                vertexNormals[i+11] = normals[side][2]

                // fifth vertex
                vertexNormals[i+12] = normals[side][0]
                vertexNormals[i+13] = normals[side][1]
                vertexNormals[i+14] = normals[side][2]

                // sixth vertex
                vertexNormals[i+15] = normals[side][0]
                vertexNormals[i+16] = normals[side][1]
                vertexNormals[i+17] = normals[side][2]
            }
        }

        const normalsBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertexNormals, gl.STATIC_DRAW)

        // Tell the attribute how to get data out of vertexBuffer (ARRAY_BUFFER)
        const normalSize = 3;          // 2 components per iteration
        const normalType = gl.FLOAT;   // the data is 32bit floats
        const normalizeNormalsData = false; // don't normalize the data
        const normalStride = 0;        // 0 = move forward normalSize * sizeof(normalType) each iteration to get the next vertex
        const normalOffset = 0;        // start at the beginning of the buffer
        const normalAttributeLocation = gl.getAttribLocation(program, 'a_normal')
        gl.enableVertexAttribArray(normalAttributeLocation)
        gl.vertexAttribPointer(
            normalAttributeLocation, normalSize, normalType, normalizeNormalsData, normalStride, normalOffset)
        // }

        // cull_face doesn't work, because I've drawn my vertices in the wrong
        // order. They should be clockwise to be front facing (I seem to have done
        // them counter-clockwise). See "CULL_FACE" at
        // https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
        //gl.enable(gl.CULL_FACE)

        // enables depth sorting, so pixels aren't drawn in order of appearance, but order only if they are visible (on top of other pixels).
        gl.enable(gl.DEPTH_TEST)

        // enable alpha blending (transparency)
        // XXX: For blending (transparency) to work, we have to disable depth testing.
        // TODO: Maybe we have to selectively enable depth testing and disable
        // blending, or vice versa, depending on the object we want to draw...
        // ...Or perhaps we must draw things in a certain order, from back to front,
        // so we can have depth testing AND blending at the same time.
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
        //gl.enable(gl.BLEND)
        //gl.disable(gl.DEPTH_TEST)

        let projectionMatrix

        updateResolution()
        function updateResolution() {
            const resolution = [
                parseFloat(getComputedStyle(gl.canvas).width) * window.devicePixelRatio,
                parseFloat(getComputedStyle(gl.canvas).height) * window.devicePixelRatio,
                1000,
            ]

            setGlResolution(gl, ...resolution)
            projectionMatrix = m4.perspective(45, resolution[0] / resolution[1], 1, 2000)
        }

        this.on('parentsizechange', () => {
            updateResolution()
        })

        const worldViewProjectionMatrixLocation = gl.getUniformLocation(program, 'u_worldViewProjectionMatrix')
        const worldInverseTransposeMatrixLocation = gl.getUniformLocation(program, 'u_worldInverseTransposeMatrix')
        const worldMatrixLocation = gl.getUniformLocation(program, 'u_worldMatrix')
        const reverseLightDirectionLocation = gl.getUniformLocation(program, 'reverseLightDirection')
        gl.uniform3fv(reverseLightDirectionLocation, v3.normalize([0.5, 0.7, 1]))
        const lightWorldPositionLocation = gl.getUniformLocation(program, 'u_lightWorldPosition')
        const cameraWorldPositionLocation = gl.getUniformLocation(program, 'u_cameraWorldPosition')
        const shininessLocation = gl.getUniformLocation(program, 'u_shininess')
        const lightColorLocation = gl.getUniformLocation(program, 'u_lightColor')
        const specularColorLocation = gl.getUniformLocation(program, 'u_specularColor')

        let shininess = 200
        gl.uniform1f(shininessLocation, shininess)

        const red = [1, 0.6, 0.6]

        let lightColor = red
        gl.uniform3fv(lightColorLocation, v3.normalize(lightColor))

        let specularColor = red
        gl.uniform3fv(specularColorLocation, v3.normalize(specularColor))


        let lightAnimParam = 0
        window.lightWorldPosition = [20,30,50]
        window.cameraAngle = 0
        window.cameraRadius   = 500
        window.rootRotationY = 0
        window.rootRotationX = 0
        window.zpos = 0

        // TODO: move to node
        const angle  = {theta: 0}
        const origin = [0.5, 0.5, 0.5]
        const originMatrix      = m4.translation(cube.width * origin[0], -cube.width * origin[1], -cube.width * origin[2])
        const scaleMatrix       = m4.scaling(1,1,1)
        let   zRotationMatrix   = m4.zRotation(angle.theta)
        let   yRotationMatrix   = m4.yRotation(angle.theta)
        const translationMatrix = m4.translation(0, 0, 0)

        let done = false
        const tween = new TWEEN.Tween(angle)
            .to({theta: 360}, 2000)
            .easing(TWEEN.Easing.Elastic.InOut)
            .onComplete(() => done = true)
            .start()

        Motor.addRenderTask(time => {
            tween.update(time)
            if (done) return false // stop the loop
            //console.log('gl tick')

            lightAnimParam += 0.1
            lightWorldPosition = [600*Math.sin(lightAnimParam), 0, 600*Math.cos(lightAnimParam)]
            gl.uniform3fv(lightWorldPositionLocation, lightWorldPosition)

            gl.clearColor(0.2, 0.04, 0.1, 1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) // why do we need to do this?

            zRotationMatrix = m4.zRotation(angle.theta)
            yRotationMatrix = m4.yRotation(angle.theta)

            //cameraAngle++
            let cameraMatrix  = m4.identity
            cameraMatrix      = m4.multiply(cameraMatrix, m4.yRotation(cameraAngle))
            cameraMatrix      = m4.multiply(cameraMatrix, m4.translation(0, 0, cameraRadius * 1.5))
            const viewMatrix  = m4.inverse(cameraMatrix)

            const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix)

            const cameraWorldPosition = [cameraMatrix[12], cameraMatrix[13], cameraMatrix[14]]
            gl.uniform3fv(cameraWorldPositionLocation, cameraWorldPosition)

            let worldMatrix = m4.identity

            // TODO: move to node
            // Node (root object)
            //
            // place everything where we want it near the center. the new
            // projectionMatrix puts the X andY origin in the center of the screen,
            // and Z is 0 at the screen and goes  negative away from the screen.
            worldMatrix = m4.multiply(worldMatrix, m4.translation(0, 0, zpos))
            //rootRotationY++
            worldMatrix = m4.multiply(worldMatrix, m4.yRotation(rootRotationY))
            worldMatrix = m4.multiply(worldMatrix, m4.xRotation(rootRotationX))

            // TODO: move to node
            // Node > Node
            //
            // matrix math is written in the opposite direction now, so that we can
            // apply the previous projection matrix only once, before all
            // drawArrays calls. For each matrix applied, think of them as happening
            // from the lastone to the first one.
            worldMatrix = m4.multiply(worldMatrix, translationMatrix)
            worldMatrix = m4.multiply(worldMatrix, zRotationMatrix)
            worldMatrix = m4.multiply(worldMatrix, yRotationMatrix)
            worldMatrix = m4.multiply(worldMatrix, scaleMatrix)
            worldMatrix = m4.multiply(worldMatrix, originMatrix)

            gl.uniformMatrix4fv(worldMatrixLocation, false, worldMatrix)

            // for correct lighting normals
            const worldInverseTransposeMatrix = m4.transpose(m4.inverse(worldMatrix))
            gl.uniformMatrix4fv(worldInverseTransposeMatrixLocation, false, worldInverseTransposeMatrix)

            const worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix)
            gl.uniformMatrix4fv(worldViewProjectionMatrixLocation, false, worldViewProjectionMatrix)

            gl.drawArrays(gl.TRIANGLES, offset, count)

            for (let i = 0; i < 5; ++i) {
                // TODO: move to node
                // Node > Node > Node > etc
                worldMatrix = m4.multiply(worldMatrix, translationMatrix)
                worldMatrix = m4.multiply(worldMatrix, zRotationMatrix)
                worldMatrix = m4.multiply(worldMatrix, yRotationMatrix)
                worldMatrix = m4.multiply(worldMatrix, scaleMatrix)
                worldMatrix = m4.multiply(worldMatrix, originMatrix)

                gl.uniformMatrix4fv(worldMatrixLocation, false, worldMatrix)

                // for correct lighting normals
                const worldInverseTransposeMatrix = m4.transpose(m4.inverse(worldMatrix))
                gl.uniformMatrix4fv(worldInverseTransposeMatrixLocation, false, worldInverseTransposeMatrix)

                const worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix)
                gl.uniformMatrix4fv(worldViewProjectionMatrixLocation, false, worldViewProjectionMatrix)

                gl.drawArrays(gl.TRIANGLES, offset, count)
            }
        })
    }

    _startSizePolling() {
        // NOTE Polling is currently required because there's no other way to do this
        // reliably, not even with MutationObserver. ResizeObserver hasn't
        // landed in browsers yet.
        if (!this._sizePollTask)
            this._sizePollTask = Motor.addRenderTask(this._checkSize.bind(this))
    }

    // NOTE, the Z dimension of a scene doesn't matter, it's a flat plane, so
    // we haven't taken that into consideration here.
    _checkSize() {

        // The scene has a parent by the time this is called (see
        // src/motor/Scene#mount where _startSizePolling is called)
        const parent = this.parentNode
        const parentSize = this._parentSize
        const style = getComputedStyle(parent)
        const width = parseFloat(style.width)
        const height = parseFloat(style.height)

        // if we have a size change, trigger parentsizechange
        if (parentSize.x != width || parentSize.y != height) {
            parentSize.x = width
            parentSize.y = height

            this.triggerEvent('parentsizechange', {...parentSize})
        }
    }

    _makeImperativeCounterpart() {
        return new Scene({
            _motorHtmlCounterpart: this
        })
    }

    /** @override */
    getStyles() {
        return styles
    }

    deinit() {
        super.deinit()

        this.imperativeCounterpart.unmount()
    }

    _stopSizePolling() {
        Motor.removeRenderTask(this._sizePollTask)
        this._sizePollTask = null
    }
}

// This associates the Transformable getters/setters with the HTML-API classes,
// so that the same getters/setters can be called from HTML side of the API.
proxyGettersSetters(Sizeable, MotorHTMLScene)

import 'document-register-element'
MotorHTMLScene = document.registerElement('motor-scene', MotorHTMLScene)

export {MotorHTMLScene as default}
