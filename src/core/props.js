import { props as skateProps } from '@trusktr/skatejs'
import { Color } from 'three'
import XYZValues from './XYZValues'
import XYZNumberValues from './XYZNumberValues'
import XYZNonNegativeValues from './XYZNonNegativeValues'
import XYZStringValues from './XYZStringValues'
import XYZSizeModeValues from './XYZSizeModeValues'

// NOTE `this` refers to the instance on which the prop exists
function createXYZPropType(Type, override = {}) {
    return {
        attribute: { source: true, target: false }, // get the value from an attribute (but don't mirror it back)
        coerce(val, propName) { return val === this[propName] ? val : this[propName].from(val) },
        default(propName) { return this[propName] },
        deserialize(val, propName) { return this[propName].fromString(val) },
        serialize(val, propName) { this[propName].toString() },
        ...override,
    }
}

function createGenericPropType(Type, override = {}) {
    return {
        attribute: { source: true, target: false }, // get the value from an attribute (but don't mirror it back)
        coerce: val => val instanceof Type ? val : new Type(val),
        default: new Type,
        deserialize: val => new Type(val),
        serialize: val => val.toString(),
        ...override,
    }
}

// skateProps gives us some default generic prop types:
// props.any
// props.array
// props.boolean
// props.number
// props.object
// props.string
export const props = {
    ...skateProps,
    boolean: {
        ...skateProps.boolean,
        deserialize: val => val != null && val !== 'false'
    },
    THREE: {
        // TODO replace THREE.Color with a persistent object that can be
        // dynamically updated, like with XYZValues
        Color: createGenericPropType(Color, {
            default: () => new Color( Math.random(), Math.random(), Math.random() ),
            serialize: val => new Color( val ).getStyle(), // returns a CSS "rbg()" string
        }),
    },
    XYZValues: createXYZPropType(XYZValues),
    XYZNumberValues: createXYZPropType(XYZNumberValues),
    XYZNonNegativeValues: createXYZPropType(XYZNonNegativeValues),
    XYZStringValues: createXYZPropType(XYZStringValues),
    XYZSizeModeValues: createXYZPropType(XYZSizeModeValues),
}

// map a SkateJS prop value to another target specified by getTarget
// NOTE `this` refers to the instance on which the prop exists
export const mapPropTo = (prop, getTarget) => ({
    ...prop,
    coerce(val, key) {
        const target = getTarget.call(this, this)
        const coerced = prop.coerce.call(this, val)
        if (target) target[key] = coerced
        return coerced
    },
    deserialize(val, key) {
        const target = getTarget.call(this, this)
        const deserialized = prop.deserialize.call(this, val)
        if (target) target[key] = deserialized
        return deserialized
    },
})

export const changePropContext = (prop, getContext) => ({
    ...prop,
    coerce(val, propName) { return prop.coerce.call(getContext.call(this, this), val, propName) },
    default(propName) { return prop.default.call(getContext.call(this, this), propName) },
    deserialize(val, propName) { return prop.deserialize.call(getContext.call(this, this), val, propName) },
    serialize(val, propName) { return prop.serialize.call(getContext.call(this, this), val, propName) },
})
