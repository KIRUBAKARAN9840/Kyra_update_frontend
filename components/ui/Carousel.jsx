import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Platform 
} from 'react-native';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import LinearGradient from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

const CarouselComponent = ({ data }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);

  const renderItem = ({ item, index }) => (
    <LinearGradient
      colors={['#FFFFFF', '#F5F5F5']}
      style={styles.carouselItem}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      key={index}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <View style={styles.itemContentContainer}>
        {item.content}
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.carouselContainer}>
      <Carousel
        ref={carouselRef}
        data={data}
        renderItem={renderItem}
        sliderWidth={screenWidth}
        itemWidth={screenWidth * 0.85}
        onSnapToItem={(index) => setActiveSlide(index)}
        activeSlideAlignment='center'
        inactiveSlideOpacity={0.7}
        inactiveSlideScale={0.9}
      />
      <Pagination
        dotsLength={data.length}
        activeDotIndex={activeSlide}
        containerStyle={styles.paginationContainer}
        dotStyle={styles.paginationDot}
        inactiveDotStyle={styles.paginationInactiveDot}
        inactiveDotOpacity={0.4}
        inactiveDotScale={0.6}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
  },
  carouselItem: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6F3C',
    marginBottom: 15,
    textAlign: 'center',
  },
  itemContentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  paginationContainer: {
    paddingTop: 10,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6F3C',
  },
  paginationInactiveDot: {
    backgroundColor: '#C4C4C4',
  },
});

export default CarouselComponent;